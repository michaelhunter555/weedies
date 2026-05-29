import type { Request, Response } from "express";
import {
  AuthIdentityError,
  applyLoginIdentitySync,
  findUserForIdentity,
  parseAuthProviderIdentity,
} from "../../lib/auth-provider-identity";
import { issueUserSession } from "../../lib/issue-user-session";

export async function login(req: Request, res: Response) {
  try {
    const identity = await parseAuthProviderIdentity(req);
    const user = await findUserForIdentity(identity);

    if (!user) {
      return void res.status(404).json({
        message: "No account found with this sign-in. Create an account first.",
      });
    }

    applyLoginIdentitySync(user, identity);

    const session = await issueUserSession(res, user, { isNewUser: false });
    return void res.status(200).json(session);
  } catch (err) {
    if (err instanceof AuthIdentityError) {
      return void res.status(err.status).json({ message: err.message });
    }
    console.log("login error", err);
    return void res.status(401).json({ message: "Login failed" });
  }
}
