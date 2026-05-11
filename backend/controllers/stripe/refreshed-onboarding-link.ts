import type { Request, Response } from "express";
import stripe from "../../utils/stripe";
import User from "../../models/user";

/**
 * Generates a fresh Stripe Connect onboarding link for a seller.
 * Used when the initial link expired or onboarding was abandoned.
 */
export default async function refreshedOnboardingLink(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const seller = await User.findById(sellerId).select(
      "_id stripeConnectAccountId",
    );
    if (!seller?.stripeConnectAccountId) {
      return void res.status(404).json({ message: "No connected account on file" });
    }

    const origin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
    const accountLink = await stripe.accountLinks.create({
      account: seller.stripeConnectAccountId,
      refresh_url: `${origin}/onboarding-cancelled`,
      return_url: `${origin}/onboarding-success`,
      type: "account_onboarding",
    });

    return void res.status(200).json({ url: accountLink.url, ok: true });
  } catch (err) {
    console.log("refreshedOnboardingLink error:", err);
    return void res.status(500).json({ message: "Failed to refresh onboarding link" });
  }
}
