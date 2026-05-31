import type { Request, Response } from "express";

import {
  FIRST_CONNECT_PAYOUT_HOLD_DAYS,
  getNextPlatformPayoutDate,
  isWithinFirstPayoutHold,
} from "../../lib/next-platform-payout-date";
import { getSellerEscrowRevenueSummary } from "../../lib/seller-escrow-revenue";
import stripe from "../../utils/stripe";
import User from "../../models/user";

type StripeBalanceBucket = {
  amount: number;
  currency: string;
  source_types?: Record<string, number>;
};

type Sum = { amount: number; currency: string };

/**
 * Aggregate Stripe Connect balance buckets into a single value per currency.
 * Returns ordered list (largest first) so the UI can show the primary currency.
 */
function sumByCurrency(buckets: StripeBalanceBucket[]): Sum[] {
  const map = new Map<string, number>();
  for (const b of buckets ?? []) {
    const cur = (b.currency || "usd").toLowerCase();
    map.set(cur, (map.get(cur) ?? 0) + Number(b.amount ?? 0));
  }
  return Array.from(map.entries())
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * GET /api/stripe/connect-balance
 *
 * Returns a digestible snapshot of the seller's Stripe Connect balance:
 *   { available, pending, reserved, instantAvailable, currency }
 *
 * All amounts are returned in MAJOR units (e.g. dollars, not cents) so the
 * UI does not have to do its own /100 math. Sellers without a Connect
 * account get a 200 with `connected: false` instead of an error.
 */
export async function getConnectBalance(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).select(
      "stripeConnectAccountId isOnboarded",
    );
    if (!user) {
      return void res.status(404).json({ message: "User not found" });
    }

    const nextEstimatedPayoutAt = getNextPlatformPayoutDate().toISOString();
    const escrow = await getSellerEscrowRevenueSummary(userId);
    const escrowSecuredMajor = escrow.securedCents / 100;
    const escrowInProgressMajor = escrow.inProgressCents / 100;

    if (!user.stripeConnectAccountId) {
      const salesRevenueTotal = escrowSecuredMajor;
      return void res.status(200).json({
        ok: true,
        connected: false,
        currency: "usd",
        available: 0,
        pending: 0,
        reserved: 0,
        instantAvailable: 0,
        /** Stripe Connect only (0 when not connected). */
        total: 0,
        stripeConnectTotal: 0,
        salesRevenueTotal,
        escrow: {
          secured: escrowSecuredMajor,
          inProgress: escrowInProgressMajor,
          securedSaleCount: escrow.securedSaleCount,
          inProgressSaleCount: escrow.inProgressSaleCount,
        },
        nextEstimatedPayoutAt,
        isLikelyFirstPayout: true,
        payoutTimingNote:
          "Your first payout may take up to 7 days while Stripe completes risk assessment. After that, bank transfers usually arrive within about 2 business days.",
      });
    }

    const connectId = String(user.stripeConnectAccountId);

    const [balance, account, paidPayouts] = await Promise.all([
      stripe.balance.retrieve({ stripeAccount: connectId }),
      stripe.accounts.retrieve(connectId),
      stripe.payouts
        .list({ limit: 1, status: "paid" }, { stripeAccount: connectId })
        .catch(() => ({ data: [] })),
    ]);

    const available = sumByCurrency(balance.available as StripeBalanceBucket[]);
    const pending = sumByCurrency(balance.pending as StripeBalanceBucket[]);
    const instant = sumByCurrency(
      (balance.instant_available ?? []) as StripeBalanceBucket[],
    );
    const reserved = sumByCurrency(
      ((balance as unknown as { connect_reserved?: StripeBalanceBucket[] })
        .connect_reserved ?? []) as StripeBalanceBucket[],
    );

    const primary =
      available[0] ?? pending[0] ?? instant[0] ?? { currency: "usd", amount: 0 };
    const currency = primary.currency;
    const pick = (rows: Sum[]) =>
      rows.find((r) => r.currency === currency)?.amount ?? 0;

    const availableMajor = pick(available) / 100;
    const pendingMajor = pick(pending) / 100;
    const reservedMajor = pick(reserved) / 100;
    const instantMajor = pick(instant) / 100;
    const stripeTotal = availableMajor + pendingMajor;
    const salesRevenueTotal = stripeTotal + escrowSecuredMajor;

    const hasPaidPayoutBefore = (paidPayouts.data?.length ?? 0) > 0;
    const accountCreated =
      typeof account.created === "number" ? account.created : undefined;
    const isLikelyFirstPayout =
      !hasPaidPayoutBefore &&
      isWithinFirstPayoutHold(accountCreated);

    const payoutTimingNote = isLikelyFirstPayout
      ? `Your first payout may take up to ${FIRST_CONNECT_PAYOUT_HOLD_DAYS} days while Stripe completes risk assessment. After that, transfers to your bank usually arrive within about 2 business days.`
      : "After funds are released to your Connect balance, transfers to your bank usually arrive within about 2 business days. Platform payout batches run Monday and Thursday (UTC).";

    return void res.status(200).json({
      ok: true,
      connected: true,
      currency: currency.toUpperCase(),
      /** Major units. */
      available: availableMajor,
      pending: pendingMajor,
      reserved: reservedMajor,
      instantAvailable: instantMajor,
      /** Stripe Connect available + pending (major units). */
      total: stripeTotal,
      stripeConnectTotal: stripeTotal,
      /** Dashboard headline: Stripe balance + funded Escrow seller net. */
      salesRevenueTotal,
      escrow: {
        secured: escrowSecuredMajor,
        inProgress: escrowInProgressMajor,
        securedSaleCount: escrow.securedSaleCount,
        inProgressSaleCount: escrow.inProgressSaleCount,
      },
      nextEstimatedPayoutAt,
      isLikelyFirstPayout,
      payoutTimingNote,
      isOnboarded: Boolean(user.isOnboarded),
    });
  } catch (err) {
    console.error("getConnectBalance:", err);
    return void res
      .status(500)
      .json({ ok: false, message: "Failed to load Stripe balance." });
  }
}
