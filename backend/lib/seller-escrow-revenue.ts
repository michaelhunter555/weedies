import mongoose from "mongoose";

import { LISTING_PURCHASE_BILLING_REASONS } from "./listing-purchase-billing";
import Transaction from "../models/transactions";

type EscrowRevenueRow = {
  amountPaid?: number;
  serviceFee?: number;
  paymentStatus?: string;
  escrowFundsSecured?: boolean;
};

export type SellerEscrowRevenueSummary = {
  /** Seller net (amountPaid − serviceFee) for funded Escrow sales, in cents. */
  securedCents: number;
  /** Escrow checkouts started but funds not secured yet, in cents. */
  inProgressCents: number;
  securedSaleCount: number;
  inProgressSaleCount: number;
};

function sellerNetCents(amountPaid: unknown, serviceFee: unknown): number {
  const paid = Number(amountPaid ?? 0);
  const fee = Number(serviceFee ?? 0);
  if (!Number.isFinite(paid) || paid <= 0) return 0;
  return Math.max(0, Math.round(paid - fee));
}

function isEscrowFundsSecured(row: EscrowRevenueRow): boolean {
  if (row.paymentStatus === "succeeded") return true;
  return row.escrowFundsSecured === true;
}

/**
 * Escrow.com pays sellers outside Stripe Connect — aggregate their marketplace sales here.
 */
export async function getSellerEscrowRevenueSummary(
  sellerId: string,
): Promise<SellerEscrowRevenueSummary> {
  if (!mongoose.isValidObjectId(sellerId)) {
    return {
      securedCents: 0,
      inProgressCents: 0,
      securedSaleCount: 0,
      inProgressSaleCount: 0,
    };
  }

  const rows = await Transaction.find({
    sellerId: new mongoose.Types.ObjectId(sellerId),
    paymentType: "escrow",
    billingReason: { $in: [...LISTING_PURCHASE_BILLING_REASONS] },
    paymentStatus: { $nin: ["canceled", "failed"] },
  })
    .select("amountPaid serviceFee paymentStatus escrowFundsSecured")
    .lean<EscrowRevenueRow[]>();

  let securedCents = 0;
  let inProgressCents = 0;
  let securedSaleCount = 0;
  let inProgressSaleCount = 0;

  for (const row of rows) {
    const net = sellerNetCents(row.amountPaid, row.serviceFee);
    if (net <= 0) continue;

    if (isEscrowFundsSecured(row)) {
      securedCents += net;
      securedSaleCount += 1;
    } else if (row.paymentStatus === "pending") {
      inProgressCents += net;
      inProgressSaleCount += 1;
    }
  }

  return {
    securedCents,
    inProgressCents,
    securedSaleCount,
    inProgressSaleCount,
  };
}
