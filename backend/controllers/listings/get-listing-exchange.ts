import type { Request, Response } from "express";
import mongoose from "mongoose";

import ListingExchange from "../../models/exchange";
import Listing from "../../models/listing";
import Transaction from "../../models/transactions";
import Review from "../../models/review";
import {
  escrowWebTransactionUrl,
  LISTING_PURCHASE_BILLING_REASONS,
} from "../../lib/listing-purchase-billing";
import { getEscrowTransaction, isEscrowApiConfigured } from "../../lib/escrow-api";
import {
  escrowProgressFromApi,
  reconcileEscrowPaymentFromApi,
} from "../../lib/escrow-reconcile";

function listingOwnerIdString(listing: { sellerId?: unknown }): string {
  const sid = listing.sellerId;
  if (!sid) return "";
  if (sid instanceof mongoose.Types.ObjectId) return String(sid);
  if (typeof sid === "object" && sid !== null && "_id" in sid) {
    return String((sid as { _id: unknown })._id);
  }
  return String(sid);
}

export type ExchangePaymentStatusJson =
  | "pending"
  | "succeeded"
  | "canceled"
  | "failed"
  | "disputed";

function normalizeExchangePaymentStatus(
  raw: string | undefined | null,
): ExchangePaymentStatusJson {
  if (raw === "captured") return "succeeded";
  if (raw === "cancelled") return "canceled";
  if (raw === "disputed") return "disputed";
  if (raw === "succeeded" || raw === "canceled" || raw === "failed" || raw === "pending") {
    return raw;
  }
  return "pending";
}

function computePhase(ex: {
  paymentReceivedAt?: Date | null;
  buyerConfirmedAt?: Date | null;
  paymentStatus?: string | null;
  sellerCapturedPayment?: boolean | null;
}): "payment" | "handover" | "completed" {
  if (ex.buyerConfirmedAt) return "completed";
  const ps = normalizeExchangePaymentStatus(ex.paymentStatus ?? undefined);
  if (ps === "canceled" || ps === "failed") return "payment";
  const captured = ps === "succeeded" || ex.sellerCapturedPayment === true;
  if (!captured) return "payment";
  return "handover";
}

function captureHoldFromTxCreated(createdAt?: Date | null): Date | null {
  if (!createdAt) return null;
  return new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
}

export async function getListingExchange(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const listingId = Array.isArray(req.params.listingId)
      ? String(req.params.listingId[0] ?? "")
      : String(req.params.listingId ?? "");
    if (!mongoose.isValidObjectId(listingId)) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const listingRaw = await Listing.findById(listingId)
      .select(
        "_id appName slug photos coverIndex status sellerId buyerId saleType currency buyItNowPrice startingPrice auctionWinningAmount",
      )
      .lean();

    const listing = listingRaw as {
      _id: mongoose.Types.ObjectId;
      appName?: string;
      slug?: string;
      photos?: string[];
      coverIndex?: number;
      status?: string;
      sellerId?: unknown;
      buyerId?: unknown;
      saleType?: string;
      currency?: string;
      buyItNowPrice?: number;
      startingPrice?: number;
      auctionWinningAmount?: number;
    } | null;

    if (!listing) {
      return void res.status(404).json({ message: "Listing not found." });
    }

    const sellerIdFromListing = listingOwnerIdString(listing);

    type SaleTxLean = {
      _id: mongoose.Types.ObjectId;
      customerId: mongoose.Types.ObjectId;
      sellerId: mongoose.Types.ObjectId;
      hasDispute?: boolean;
      disputeId?: mongoose.Types.ObjectId;
      paymentStatus?: string;
      amountPaid?: number;
      paymentType?: "stripe" | "escrow";
      escrowTransactionId?: string;
      escrowLastEvent?: string;
      escrowFundsSecured?: boolean;
      escrowEvents?: { event: string; at: Date }[];
      createdAt?: Date;
    };

    let saleTx = (await Transaction.findOne({
      ListingId: listing._id,
      billingReason: { $in: [...LISTING_PURCHASE_BILLING_REASONS] },
      paymentStatus: { $in: ["pending", "succeeded"] },
    })
      .sort({ createdAt: -1 })
      .select(
        "_id customerId sellerId hasDispute disputeId paymentStatus amountPaid paymentType escrowTransactionId escrowLastEvent escrowFundsSecured escrowEvents createdAt",
      )
      .lean()) as SaleTxLean | null;

    if (
      saleTx?.paymentType === "escrow" &&
      saleTx.escrowTransactionId &&
      saleTx.paymentStatus === "pending"
    ) {
      try {
        await reconcileEscrowPaymentFromApi(String(saleTx.escrowTransactionId));
        saleTx = (await Transaction.findOne({
          ListingId: listing._id,
          billingReason: { $in: [...LISTING_PURCHASE_BILLING_REASONS] },
          paymentStatus: { $in: ["pending", "succeeded", "canceled"] },
        })
          .sort({ createdAt: -1 })
          .select(
            "_id customerId sellerId hasDispute disputeId paymentStatus amountPaid paymentType escrowTransactionId escrowLastEvent escrowFundsSecured escrowEvents createdAt",
          )
          .lean()) as SaleTxLean | null;
        if (listing.status !== "sold") {
          const listingRefresh = (await Listing.findById(listing._id)
            .select("status buyerId")
            .lean()) as { status?: string; buyerId?: unknown } | null;
          if (listingRefresh?.status) {
            listing.status = listingRefresh.status;
            listing.buyerId = listingRefresh.buyerId;
          }
        }
      } catch (err) {
        console.warn("getListingExchange escrow reconcile:", err);
      }
    }

    const listingIsSold = listing.status === "sold";
    const escrowInProgress =
      saleTx?.paymentType === "escrow" && saleTx.paymentStatus === "pending";
    const auctionReservedAwaitingPayment =
      listing.status === "reserved" && Boolean(listing.buyerId);

    if (!listingIsSold && !escrowInProgress && !auctionReservedAwaitingPayment) {
      return void res.status(404).json({
        message:
          "Exchange opens after checkout. For Escrow, finish payment on Escrow.com first.",
      });
    }

    const sellerId = saleTx
      ? String(saleTx.sellerId)
      : sellerIdFromListing;
    const buyerId = listing.buyerId
      ? String(listing.buyerId)
      : saleTx
        ? String(saleTx.customerId)
        : "";

    if (!buyerId || !sellerId) {
      return void res.status(409).json({ message: "Sale parties could not be resolved." });
    }

    if (userId !== sellerId && userId !== buyerId) {
      return void res.status(403).json({ message: "Not a party to this sale." });
    }

    const escrowAwaitingFunds = escrowInProgress && !listingIsSold;
    const awaitingAuctionCheckout =
      auctionReservedAwaitingPayment && !listingIsSold && !saleTx;

    type ExchangeLean = {
      _id: mongoose.Types.ObjectId;
      listingId: mongoose.Types.ObjectId;
      sellerId: mongoose.Types.ObjectId;
      buyerId: mongoose.Types.ObjectId;
      paymentReceivedAt?: Date | null;
      buyerConfirmedAt?: Date | null;
      deliverables?: { url: string; originalName?: string; uploadedAt?: Date }[];
      updatedAt?: Date;
      sellerCapturedPayment?: boolean;
      paymentCaptureExpiration?: Date | null;
      paymentStatus?: string | null;
    };

    let ex: ExchangeLean | null = (await ListingExchange.findOne({
      listingId: listing._id,
    }).lean()) as ExchangeLean | null;

    if (
      saleTx?.paymentType === "escrow" &&
      saleTx.paymentStatus === "succeeded" &&
      ex &&
      normalizeExchangePaymentStatus(ex.paymentStatus ?? undefined) !== "succeeded"
    ) {
      await ListingExchange.updateOne(
        { _id: ex._id },
        {
          $set: {
            paymentStatus: "succeeded",
            sellerCapturedPayment: true,
            paymentReceivedAt: ex.paymentReceivedAt ?? new Date(),
          },
        },
      );
      ex = {
        ...ex,
        paymentStatus: "succeeded",
        sellerCapturedPayment: true,
        paymentReceivedAt: ex.paymentReceivedAt ?? new Date(),
      };
    }
    if (!ex) {
      const tx = (await Transaction.findOne({
        ListingId: listing._id,
        billingReason: { $in: [...LISTING_PURCHASE_BILLING_REASONS] },
        paymentStatus: { $in: ["succeeded", "pending"] },
      })
        .sort({ createdAt: -1 })
        .select("createdAt paymentType paymentStatus escrowFundsSecured")
        .lean()) as {
        createdAt?: Date;
        paymentType?: string;
        paymentStatus?: string;
        escrowFundsSecured?: boolean;
      } | null;

      const escrowAwaitingPayment =
        tx?.paymentType === "escrow" &&
        tx.paymentStatus === "pending" &&
        !tx.escrowFundsSecured;

      const created = await ListingExchange.create({
        listingId: listing._id,
        sellerId: new mongoose.Types.ObjectId(sellerId),
        buyerId: new mongoose.Types.ObjectId(buyerId),
        paymentReceivedAt:
          escrowAwaitingPayment || !tx?.createdAt ? null : new Date(tx.createdAt),
        deliverables: [],
        sellerCapturedPayment: false,
        paymentStatus: "pending",
        paymentCaptureExpiration: escrowAwaitingPayment
          ? null
          : captureHoldFromTxCreated(tx?.createdAt ? new Date(tx.createdAt) : null),
      });
      ex = created.toObject() as ExchangeLean;
    } else if (!ex.paymentReceivedAt) {
      const tx = (await Transaction.findOne({
        ListingId: listing._id,
        billingReason: { $in: [...LISTING_PURCHASE_BILLING_REASONS] },
        paymentStatus: { $in: ["succeeded", "pending"] },
      })
        .sort({ createdAt: -1 })
        .select("createdAt paymentType paymentStatus escrowFundsSecured")
        .lean()) as {
        createdAt?: Date;
        paymentType?: string;
        paymentStatus?: string;
        escrowFundsSecured?: boolean;
      } | null;

      const escrowAwaitingPayment =
        tx?.paymentType === "escrow" &&
        tx.paymentStatus === "pending" &&
        !tx.escrowFundsSecured;

      if (tx?.createdAt && !escrowAwaitingPayment) {
        const payAt = new Date(tx.createdAt);
        const patch: Record<string, unknown> = { paymentReceivedAt: payAt };
        if (!ex.paymentCaptureExpiration) {
          patch.paymentCaptureExpiration = captureHoldFromTxCreated(payAt);
        }
        await ListingExchange.updateOne({ _id: ex._id }, { $set: patch });
        ex = {
          ...ex,
          paymentReceivedAt: payAt,
          paymentCaptureExpiration:
            ex.paymentCaptureExpiration ?? captureHoldFromTxCreated(payAt),
        } as ExchangeLean;
      }
    }

    if (!ex) {
      return void res.status(500).json({ message: "Failed to initialize exchange" });
    }

    const role = userId === buyerId ? "buyer" : "seller";
    const phase = computePhase(ex);
    const paymentStatusJson = normalizeExchangePaymentStatus(ex.paymentStatus ?? undefined);

    let escrowProgress: ReturnType<typeof escrowProgressFromApi> | null = null;
    if (
      saleTx?.paymentType === "escrow" &&
      saleTx.escrowTransactionId &&
      isEscrowApiConfigured()
    ) {
      try {
        const escrowTx = await getEscrowTransaction(String(saleTx.escrowTransactionId));
        escrowProgress = escrowProgressFromApi(escrowTx);
      } catch (err) {
        console.warn("getListingExchange escrow progress:", err);
      }
    }

    let buyerReview: {
      _id: string;
      rating: number | null;
      comment: string;
      datePosted: string;
    } | null = null;
    if (role === "buyer") {
      const rev = (await Review.findOne({
        listingId: listing._id,
        userId: new mongoose.Types.ObjectId(userId),
      })
        .select("rating comment datePosted")
        .lean()) as {
        _id: mongoose.Types.ObjectId;
        rating?: number | null;
        comment?: string;
        datePosted?: Date;
      } | null;
      if (rev) {
        buyerReview = {
          _id: String(rev._id),
          rating: typeof rev.rating === "number" ? rev.rating : null,
          comment: rev.comment ?? "",
          datePosted:
            rev.datePosted instanceof Date
              ? rev.datePosted.toISOString()
              : new Date(rev.datePosted as unknown as string).toISOString(),
        };
      }
    }

    return void res.status(200).json({
      role,
      phase,
      awaitingAuctionCheckout,
      escrowAwaitingFunds,
      escrowProgress,
      buyerReview,
      transaction: saleTx
        ? {
            id: String(saleTx._id),
            hasDispute: Boolean(saleTx.hasDispute),
            disputeId: saleTx.disputeId ? String(saleTx.disputeId) : null,
            amountPaidCents: Number(saleTx.amountPaid ?? 0),
            paymentStatus: saleTx.paymentStatus ?? null,
            paymentType: saleTx.paymentType ?? "stripe",
            escrowTransactionId: saleTx.escrowTransactionId
              ? String(saleTx.escrowTransactionId)
              : null,
            escrowTransactionUrl:
              saleTx.paymentType === "escrow" && saleTx.escrowTransactionId
                ? escrowWebTransactionUrl(String(saleTx.escrowTransactionId))
                : null,
            escrowLastEvent: saleTx.escrowLastEvent ?? null,
            escrowFundsSecured: Boolean(saleTx.escrowFundsSecured),
            escrowEvents: (saleTx.escrowEvents ?? []).map((e) => ({
              event: e.event,
              at: e.at instanceof Date ? e.at.toISOString() : String(e.at),
            })),
          }
        : null,
      exchange: {
        _id: String(ex._id),
        listingId: String(ex.listingId),
        sellerId: String(ex.sellerId),
        buyerId: String(ex.buyerId),
        paymentReceivedAt: ex.paymentReceivedAt
          ? new Date(ex.paymentReceivedAt).toISOString()
          : null,
        deliverables: (ex.deliverables ?? []).map(
          (d: { url: string; originalName?: string; uploadedAt?: Date }) => ({
            url: d.url,
            originalName: d.originalName,
            uploadedAt:
              d.uploadedAt instanceof Date
                ? d.uploadedAt.toISOString()
                : new Date(d.uploadedAt as unknown as string).toISOString(),
          }),
        ),
        buyerConfirmedAt: ex.buyerConfirmedAt
          ? new Date(ex.buyerConfirmedAt).toISOString()
          : null,
        updatedAt:
          (ex as { updatedAt?: Date }).updatedAt instanceof Date
            ? (ex as { updatedAt: Date }).updatedAt.toISOString()
            : null,
        sellerCapturedPayment: Boolean(ex.sellerCapturedPayment),
        paymentCaptureExpiration: ex.paymentCaptureExpiration
          ? new Date(ex.paymentCaptureExpiration).toISOString()
          : null,
        paymentStatus: paymentStatusJson,
      },
      listing: {
        _id: String(listing._id),
        appName: listing.appName,
        slug: listing.slug,
        photos: listing.photos ?? [],
        coverIndex: listing.coverIndex ?? 0,
        saleType: listing.saleType,
        status: listing.status,
        currency: listing.currency ?? "USD",
        buyItNowPrice: listing.buyItNowPrice,
        startingPrice: listing.startingPrice,
        auctionWinningAmount: listing.auctionWinningAmount,
      },
    });
  } catch (err) {
    console.log("getListingExchange error:", err);
    return void res.status(500).json({ message: "Failed to load exchange" });
  }
}
