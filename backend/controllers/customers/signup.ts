import type { Request, Response } from "express";
import UserModel from "../../models/user";
import stripe from "../../utils/stripe";
import {
  AuthIdentityError,
  applyNewUserIdentity,
  findUserForIdentity,
  parseAuthProviderIdentity,
} from "../../lib/auth-provider-identity";
import { toAppUserJson } from "../../lib/serialize-app-user";
import { issueUserSession } from "../../lib/issue-user-session";

export async function signup(req: Request, res: Response) {
  try {
    const identity = await parseAuthProviderIdentity(req);
    const existing = await findUserForIdentity(identity);

    if (existing) {
      return void res.status(409).json({
        message: "An account already exists with this sign-in. Use Sign in instead.",
        code: "ACCOUNT_EXISTS",
        user: toAppUserJson(existing),
      });
    }

    const user = new UserModel();
    applyNewUserIdentity(user, identity, req.body ?? {});
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
  } catch (err) {
    if (err instanceof AuthIdentityError) {
      return void res.status(err.status).json({ message: err.message });
    }
    console.log("signup error", err);
    return void res.status(401).json({ message: "Signup failed" });
  }
}
