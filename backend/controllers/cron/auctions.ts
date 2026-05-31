import Listing from "../../models/listing";
import User from "../../models/user";
import { finalizeEndedAuction } from "../../lib/finalize-ended-auction";
import { auctionEndingSoonNotificationEmail } from "../../lib/email-notifications";

const ENDING_SOON_MS = 24 * 60 * 60 * 1000;

function clientOrigin(): string {
  const raw = process.env.CLIENT_ORIGIN?.trim();
  if (raw) {
    const first = raw.split(",")[0]?.trim();
    if (first) return first.replace(/\/$/, "");
  }
  return "https://dapandflip.com";
}

/**
 * Finalize auctions whose end time has passed: reserve high bidder, notify parties.
 * Does not mark listings sold — payment happens in checkout / exchange.
 */
export async function finalizeEndedAuctions(): Promise<void> {
  const now = new Date();
  const due = await Listing.find({
    saleType: "auction",
    status: "live",
    auctionEndDate: { $lte: now },
  })
    .select("_id")
    .lean();

  for (const row of due) {
    try {
      await finalizeEndedAuction(String(row._id));
    } catch (err) {
      console.error("[cron] finalizeEndedAuction", row._id, err);
    }
  }
}

/** Email seller + followers once when an auction ends within 24 hours. */
export async function notifyAuctionsEndingSoon(): Promise<void> {
  const now = Date.now();
  const windowEnd = new Date(now + ENDING_SOON_MS);

  const listings = await Listing.find({
    saleType: "auction",
    status: "live",
    auctionEndDate: { $gt: new Date(now), $lte: windowEnd },
    auctionEndingSoonNotifiedAt: { $exists: false },
  }).select(
    "appName slug auctionEndDate sellerId auctionFollowers",
  );

  const origin = clientOrigin();

  for (const listing of listings) {
    const end = listing.auctionEndDate
      ? new Date(listing.auctionEndDate)
      : null;
    if (!end || Number.isNaN(end.getTime())) continue;

    const listingId = String(listing._id);
    const slugPart = listing.slug
      ? `/${encodeURIComponent(listing.slug)}`
      : "";
    const listingUrl = `${origin}/products/${encodeURIComponent(listingId)}${slugPart}`;
    const appName = String(listing.appName ?? "Listing");

    const seller = (await User.findById(listing.sellerId)
      .select("email name")
      .lean()) as { email?: string; name?: string } | null;
    if (seller?.email) {
      await auctionEndingSoonNotificationEmail(
        String(seller.email),
        String(seller.name ?? "Seller"),
        appName,
        listingId,
        end,
        listingUrl,
      );
    }

    const followerIds = [
      ...new Set(
        (listing.auctionFollowers ?? []).map((id: unknown) => String(id)).filter(Boolean),
      ),
    ].filter((id) => id !== String(listing.sellerId));

    if (followerIds.length) {
      const followers = (await User.find({ _id: { $in: followerIds } })
        .select("email name")
        .lean()) as { email?: string; name?: string }[];
      for (const f of followers) {
        if (!f.email) continue;
        await auctionEndingSoonNotificationEmail(
          String(f.email),
          String(f.name ?? "Bidder"),
          appName,
          listingId,
          end,
          listingUrl,
        );
      }
    }

    listing.auctionEndingSoonNotifiedAt = new Date();
    await listing.save();
  }
}

/** Default cron entry: finalize ended + ending-soon reminders. */
export default async function runAuctionCronJobs(): Promise<void> {
  await finalizeEndedAuctions();
  await notifyAuctionsEndingSoon();
}

