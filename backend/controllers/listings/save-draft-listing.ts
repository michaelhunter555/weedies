import type { Request, Response } from "express";
import Listing from "../../models/listing";
import {
  ensureUniqueListingSlug,
  slugifyAppName,
} from "../../utils/listing-slug";
import {
  parseOptionalNonNegNumber,
  parsePrivateListingFlag,
} from "../../lib/listing-submission-fields";
import {
  prepareAppDescriptionForWrite,
  sanitizeListingDescriptionFields,
} from "../../lib/listing-description";
import type {
  ListingCategory,
  ListingDifficulty,
  ListingSaleType,
  ListingTurnaround,
} from "../../types";

const CATEGORIES: ListingCategory[] = [
  "ai-tools",
  "productivity",
  "games",
  "dev-tools",
  "design",
  "extensions",
];

function pickCategory(raw: unknown): ListingCategory {
  const s = String(raw ?? "").trim();
  return CATEGORIES.includes(s as ListingCategory)
    ? (s as ListingCategory)
    : "ai-tools";
}

function pickDifficulty(raw: unknown): ListingDifficulty {
  const s = String(raw ?? "").trim();
  return s === "beginner" || s === "intermediate" || s === "advanced"
    ? s
    : "beginner";
}

function pickTurnaround(raw: unknown): ListingTurnaround {
  const s = String(raw ?? "").trim();
  return ["24h", "3d", "1w", "2w", "1m"].includes(s)
    ? (s as ListingTurnaround)
    : "24h";
}

function pickSaleType(raw: unknown): ListingSaleType {
  return raw === "auction" ? "auction" : "fixed";
}

/**
 * Upsert a seller-owned draft without charging listing fees or bumping
 * `User.totalListings` - used by “Save draft” on the new-listing form.
 */
export async function saveDraftListing(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const draftListingIdRaw = body.draftListingId;
    const draftListingId =
      typeof draftListingIdRaw === "string" && draftListingIdRaw.trim()
        ? draftListingIdRaw.trim()
        : undefined;

    const appName = String(body.appName ?? "").trim() || "Untitled listing";
    const tagline = String(body.tagline ?? "").trim() || "-";
    const descriptionPrepared = prepareAppDescriptionForWrite(
      body.appDescription ?? "",
      { minPlainText: 0 },
    );
    const draftFallback = prepareAppDescriptionForWrite(
      "Draft - add a description.",
      { minPlainText: 0 },
    );
    const appDescription =
      descriptionPrepared.ok && descriptionPrepared.value.trim()
        ? descriptionPrepared.value
        : draftFallback.ok
          ? draftFallback.value
          : "<p>Draft - add a description.</p>";
    const startingPrice = Math.max(
      0,
      Number(body.startingPrice ?? 0) || 0,
    );
    const isBuyItNow =
      body.isBuyItNow === true ||
      (body.buyItNowPrice != null &&
        body.buyItNowPrice !== "" &&
        Number(body.buyItNowPrice) > 0);
    const buyItNowPrice = isBuyItNow
      ? Math.max(0, Number(body.buyItNowPrice) || 0)
      : undefined;
    const category = pickCategory(body.category);
    const difficulty = pickDifficulty(body.difficulty);
    const turnaround = pickTurnaround(body.turnaround);
    const ageOfBusinessMonths = Math.max(
      0,
      Number(body.ageOfBusinessMonths ?? 0) || 0,
    );
    const photos = Array.isArray(body.photos)
      ? (body.photos as unknown[]).map((u) => String(u)).filter(Boolean)
      : [];
    const coverIndex = Math.min(
      Math.max(0, Number(body.coverIndex ?? 0) || 0),
      Math.max(0, photos.length - 1),
    );
    const hasSalesToVerify = Boolean(body.hasSalesToVerify);
    const hasAnalyticsToVerify = Boolean(body.hasAnalyticsToVerify);
    const isPrivateListing = parsePrivateListingFlag(body.isPrivateListing);
    const monthlyRevenue = parseOptionalNonNegNumber(body.monthlyRevenue);
    const saleType = pickSaleType(body.saleType);
    const auctionStartDate = body.auctionStartDate
      ? new Date(String(body.auctionStartDate))
      : undefined;
    const auctionEndDate = body.auctionEndDate
      ? new Date(String(body.auctionEndDate))
      : undefined;

    const fromClient =
      typeof body.slug === "string" && body.slug.trim().length > 0
        ? slugifyAppName(body.slug)
        : slugifyAppName(appName);

    if (draftListingId) {
      const existing = await Listing.findOne({
        _id: draftListingId,
        sellerId,
        status: "draft",
      });
      if (!existing) {
        return void res
          .status(404)
          .json({ message: "Draft listing not found" });
      }

      const slugBase = fromClient || slugifyAppName(appName);
      const slug = await ensureUniqueListingSlug(
        slugBase,
        String(existing._id),
      );

      existing.set({
        appName,
        tagline,
        appDescription,
        startingPrice,
        buyItNowPrice,
        category,
        difficulty,
        turnaround,
        ageOfBusinessMonths,
        photos,
        coverIndex,
        hasSalesToVerify,
        hasAnalyticsToVerify,
        isPrivateListing,
        ...(monthlyRevenue !== undefined ? { monthlyRevenue } : {}),
        saleType,
        slug,
      });

      if (
        saleType === "auction" &&
        auctionStartDate &&
        !Number.isNaN(auctionStartDate.getTime()) &&
        auctionEndDate &&
        !Number.isNaN(auctionEndDate.getTime())
      ) {
        existing.auctionStartDate = auctionStartDate;
        existing.auctionEndDate = auctionEndDate;
      } else {
        existing.auctionStartDate = undefined;
        existing.auctionEndDate = undefined;
      }

      await existing.save();
      return void res.status(200).json(
        sanitizeListingDescriptionFields(
          existing.toObject() as Record<string, unknown>,
        ),
      );
    }

    const slug = await ensureUniqueListingSlug(fromClient || slugifyAppName(appName));

    const listing = await Listing.create({
      sellerId,
      slug,
      status: "draft" as const,
      appName,
      tagline,
      appDescription,
      category,
      difficulty,
      turnaround,
      ageOfBusinessMonths,
      saleType,
      startingPrice,
      buyItNowPrice,
      photos,
      coverIndex,
      hasSalesToVerify,
      hasAnalyticsToVerify,
      isPrivateListing,
      ...(monthlyRevenue !== undefined ? { monthlyRevenue } : {}),
      currency: "USD",
      tags: [],
      techStack: [],
      verifiedProviders: [],
      isListingVerified: false,
      isAnalyticsVerified: false,
      views: 0,
      favoritesCount: 0,
      totalReviews: 0,
      averageRating: 0,
      ...(saleType === "auction" &&
      auctionStartDate &&
      !Number.isNaN(auctionStartDate.getTime()) &&
      auctionEndDate &&
      !Number.isNaN(auctionEndDate.getTime())
        ? { auctionStartDate, auctionEndDate }
        : {}),
    });

    return void res.status(201).json(
      sanitizeListingDescriptionFields(
        listing.toObject() as Record<string, unknown>,
      ),
    );
  } catch (err) {
    console.log("saveDraftListing error:", err);
    return void res.status(500).json({ message: "Failed to save draft" });
  }
}
