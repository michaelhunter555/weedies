import type { Request, Response } from "express";
import stripe from "../../utils/stripe";
import User from "../../models/user";
import { toAppUserJson } from "../../lib/serialize-app-user";

/**
 * Returns the current user profile and refreshes Stripe Connect onboarding
 * state from Stripe (`details_submitted` → `isOnboarded`).
 */
export async function getMe(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return void res.status(404).json({ message: "User not found" });
    }

    if (user.stripeConnectAccountId) {
      try {
        const acct = await stripe.accounts.retrieve(user.stripeConnectAccountId);
        const submitted = Boolean(acct.details_submitted);
        if (Boolean(user.isOnboarded) !== submitted) {
          user.isOnboarded = submitted;
          await user.save();
        }
      } catch (err) {
        console.log("getMe: stripe.accounts.retrieve failed", err);
      }
    }

    return void res.status(200).json({ user: toAppUserJson(user) });
  } catch (err) {
    console.log("getMe error:", err);
    return void res.status(500).json({ message: "Failed to load profile" });
  }
}
