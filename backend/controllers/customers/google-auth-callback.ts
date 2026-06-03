import type { Request, Response } from "express";

import {
  applyLoginIdentitySync,
  applyNewUserIdentity,
  findUserForIdentity,
} from "../../lib/auth-provider-identity";
import { exchangeGoogleAuthCode } from "../../lib/exchange-google-auth-code";
import { googleIdentityFromIdToken } from "../../lib/google-identity-from-token";
import { issueUserSession } from "../../lib/issue-user-session";
import { toAppUserJson } from "../../lib/serialize-app-user";
import UserModel from "../../models/user";
import stripe from "../../utils/stripe";

/**
 * Complete Google OAuth redirect (`/callback/google?code=...`).
 * Exchanges the code server-side (needs GOOGLE_CLIENT_SECRET), then login or sign-up.
 */
export async function googleAuthCallback(req: Request, res: Response) {
  try {
    const code =
      typeof req.body?.code === "string" ? req.body.code.trim() : "";
    const redirectUri =
      typeof req.body?.redirectUri === "string"
        ? req.body.redirectUri.trim()
        : "";
    const intent = req.body?.intent === "signup" ? "signup" : "login";

    if (!code || !redirectUri) {
      return void res.status(400).json({ message: "Missing code or redirectUri" });
    }

    const idToken = await exchangeGoogleAuthCode(code, redirectUri);
    const identity = await googleIdentityFromIdToken(idToken);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const existing = await findUserForIdentity(identity);

    if (intent === "signup") {
      if (existing) {
        return void res.status(409).json({
          message:
            "An account already exists with this sign-in. Use Sign in instead.",
          code: "ACCOUNT_EXISTS",
          user: toAppUserJson(existing),
        });
      }

      const user = new UserModel();
      applyNewUserIdentity(user, identity, body);
      await user.save();

      if (!user.stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
        });
        user.stripeCustomerId = customer.id;
        await user.save();
      }

      const session = await issueUserSession(res, user, { isNewUser: true });
      return void res.status(200).json(session);
    }

    if (!existing) {
      return void res.status(404).json({
        message: "No account found with this sign-in. Create an account first.",
      });
    }

    if (applyLoginIdentitySync(existing, identity)) {
      await existing.save();
    }

    const session = await issueUserSession(res, existing, { isNewUser: false });
    return void res.status(200).json(session);
  } catch (err) {
    console.error("googleAuthCallback error:", err);
    const msg =
      err instanceof Error ? err.message : "Google sign-in failed";
    return void res.status(401).json({ message: msg });
  }
}
