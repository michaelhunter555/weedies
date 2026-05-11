import type { Request, Response } from "express";
import stripe from "../../utils/stripe";
import User from "../../models/user";

/**
 * Creates a Stripe Connect Express account for the authenticated seller and
 * returns the first onboarding link.
 *
 * Contract (matches `useStripeWallet.startSellerOnboarding`):
 *   POST /api/stripe/create-connect-account
 *   ← { url, stripeConnectAccountId, ok: true }
 *
 * If the seller already has a `stripeConnectAccountId` on file we don't
 * create a duplicate account — we just hand back a fresh onboarding link
 * so the client can resume.
 */
export default async function createConnectAccount(
  req: Request,
  res: Response,
) {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(sellerId);
    if (!user) {
      return void res.status(404).json({ message: "User not found" });
    }

    const origin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
    const refresh_url = `${origin}/onboarding-cancelled`;
    const return_url = `${origin}/onboarding-success`;

    // Reuse an existing Connect account if one already exists for this user.
    let stripeConnectAccountId = user.stripeConnectAccountId ?? undefined;

    if (!stripeConnectAccountId) {
      const account = await stripe.accounts.create(
        {
          country: "US",
          email: user.email,
          controller: {
            losses: { payments: "application" },
            fees: { payer: "account" },
            stripe_dashboard: { type: "express" },
            requirement_collection: "stripe",
          },
          settings: {
            payouts: {
              debit_negative_balances: true,
              schedule: { interval: "manual" },
            },
          },
        },
        {
          idempotencyKey: `${String(user._id)}::stripe:connect:account:create`,
        },
      );

      stripeConnectAccountId = account.id;
      user.stripeConnectAccountId = account.id;
      await user.save();
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeConnectAccountId,
      refresh_url,
      return_url,
      type: "account_onboarding",
    });

    if (!accountLink?.url) {
      return void res
        .status(500)
        .json({ message: "Failed to create onboarding link" });
    }

    return void res.status(201).json({
      url: accountLink.url,
      stripeConnectAccountId,
      ok: true,
    });
  } catch (err) {
    console.log("createConnectAccount error:", err);
    return void res
      .status(500)
      .json({ message: "Failed to create Stripe Connect account" });
  }
}
