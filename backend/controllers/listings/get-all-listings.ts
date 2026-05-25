import type { Request, Response } from "express";
import { attachAuctionSummary } from "../../lib/listing-auction-summary";
import Listing from "../../models/listing";

/**
 * Public marketplace feed. Supports basic filtering + pagination via
 * query params: ?category=ai-tools&difficulty=beginner&q=foo&page=1&limit=24
 *
 * TODO: full-text search, sorting, price range, verified-only filter.
 */
export async function getAllListings(req: Request, res: Response) {
  try {
    const {
      category,
      difficulty,
      turnaround,
      saleType,
      q,
      page = "1",
      limit = "24",
    } = req.query as Record<string, string | undefined>;

    const filter: Record<string, unknown> = { status: "live" };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (turnaround) filter.turnaround = turnaround;
    if (saleType) filter.saleType = saleType;
    if (q) filter.$text = { $search: q };

    const pageNum = Math.max(1, Number(page) || 1);
    const lim = Math.min(60, Math.max(1, Number(limit) || 24));

    const [items, total] = await Promise.all([
      Listing.find(filter)
        .sort({ publishedAt: -1 })
        .skip((pageNum - 1) * lim)
        .limit(lim)
        .populate(
          "sellerId",
          "name email isVerifiedCreator hasVerifiedAnalytics sellerRating totalSellerReviews totalListingsSold",
        ),
      Listing.countDocuments(filter),
    ]);

    const viewerId = req.user?.userId ?? "";

    const shaped = items.map((doc) => {
      const o = doc.toObject() as Record<string, unknown>;
      const sellerRaw = o.sellerId as unknown;
      const sellerId =
        sellerRaw && typeof sellerRaw === "object" && "_id" in sellerRaw
          ? String((sellerRaw as { _id: unknown })._id)
          : typeof sellerRaw === "string"
            ? sellerRaw
            : "";
      const isOwner = Boolean(viewerId && sellerId && viewerId === sellerId);

      const approved = Array.isArray(doc.approvedUsersList)
        ? doc.approvedUsersList.map((id: unknown) => String(id))
        : [];
      const canViewPrivate = !doc.isPrivateListing || isOwner || approved.includes(viewerId);
      const pendingRows = Array.isArray(doc.pendingPrivateListingRequests)
        ? (doc.pendingPrivateListingRequests as Array<{
            _id?: unknown;
            requesterId?: unknown;
            status?: "pending" | "approved" | "denied";
          }>)
        : [];
      const mine = viewerId
        ? pendingRows.find((r: { requesterId?: unknown }) => String(r.requesterId) === viewerId)
        : undefined;

      const base = doc.saleType === "auction" ? attachAuctionSummary(o) : o;
      const safeBase = base as Record<string, unknown>;

      if (doc.isPrivateListing && !canViewPrivate) {
        const masked = {
          ...safeBase,
          appName: "Private listing",
          tagline: "Request access to unlock full listing details.",
          appDescription:
            "This listing is private. The seller must approve your request before full details are shown.",
          photos: [],
          demoUrl: undefined,
          repoUrl: undefined,
          liveUrl: undefined,
          tags: [],
          techStack: [],
          sellerId: null,
          privateAccess: {
            canView: false,
            status: mine?.status ?? "none",
            requestId: mine?._id ? String(mine._id) : null,
          },
        } as Record<string, unknown>;
        const {
          auctionBids: _ab,
          approvedUsersList: _aul,
          pendingPrivateListingRequests: _ppr,
          ...restMasked
        } = masked;
        return restMasked;
      }

      const withAccess = {
        ...safeBase,
        privateAccess: {
          canView: true,
          status: "approved",
          requestId: null,
        },
      } as Record<string, unknown>;
      const {
        auctionBids: _ab,
        approvedUsersList: _aul,
        pendingPrivateListingRequests: _ppr,
        ...rest
      } = withAccess;
      return rest;
    });

    return void res.status(200).json({
      items: shaped,
      total,
      page: pageNum,
      limit: lim,
    });
  } catch (err) {
    console.log("getAllListings error:", err);
    return void res.status(500).json({ message: "Failed to fetch listings" });
  }
}
