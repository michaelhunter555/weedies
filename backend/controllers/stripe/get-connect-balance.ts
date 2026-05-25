import type { Request, Response } from "express";

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

    if (!user.stripeConnectAccountId) {
      return void res.status(200).json({
        ok: true,
        connected: false,
        currency: "usd",
        available: 0,
        pending: 0,
        reserved: 0,
        instantAvailable: 0,
      });
    }

    const balance = await stripe.balance.retrieve({
      stripeAccount: String(user.stripeConnectAccountId),
    });

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

    return void res.status(200).json({
      ok: true,
      connected: true,
      currency: currency.toUpperCase(),
      /** Major units. */
      available: pick(available) / 100,
      pending: pick(pending) / 100,
      reserved: pick(reserved) / 100,
      instantAvailable: pick(instant) / 100,
      isOnboarded: Boolean(user.isOnboarded),
    });
  } catch (err) {
    console.error("getConnectBalance:", err);
    return void res
      .status(500)
      .json({ ok: false, message: "Failed to load Stripe balance." });
  }
}
