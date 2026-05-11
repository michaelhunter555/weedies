import type { Request, Response } from "express";
import stripe from "../../utils/stripe";
import User from "../../models/user";

/**
 * DANGER — test-only helper.
 *
 * Detaches a seller's Stripe Connect account on both Stripe and our DB so
 * they can re-run onboarding from scratch. Gated behind `requireRole("admin")`
 * or `NODE_ENV !== "production"` in the route layer.
 */
export default async function deleteConnectedAccount(req: Request, res: Response) {
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

    await stripe.accounts.del(seller.stripeConnectAccountId);

    seller.stripeConnectAccountId = undefined;
    await seller.save();

    return void res.status(200).json({ success: true });
  } catch (err) {
    console.log("deleteConnectedAccount error:", err);
    return void res.status(500).json({ message: "Failed to delete connected account" });
  }
}
