import type { Request } from "express";
import type { HydratedDocument } from "mongoose";
import UserModel, { type User } from "../models/user";
import { applyUserLocaleFields } from "./user-locale";

export type UserDocument = HydratedDocument<User>;
import { verifyFirebaseIdToken } from "./verifyFirebaseIdToken";
import { verifyGoogleIdToken } from "./verifyGoogleIdToken";
import {
  emailVerifiedFromFirebaseClaims,
  initialEmailVerifiedForSignup,
  isGoogleAuthProvider,
} from "./user-email-verified";

export type AuthProviderIdentity = {
  email: string;
  name?: string;
  firebaseUid?: string;
  googleSub?: string;
  authProvider: "firebase" | "google";
  tokenEmailVerified: boolean;
};

export async function parseAuthProviderIdentity(
  req: Request,
): Promise<AuthProviderIdentity> {
  const provider = (req.body?.provider as string | undefined) || "firebase";
  const idToken = req.body?.idToken as string | undefined;
  if (!idToken) {
    throw new AuthIdentityError(400, "Missing idToken");
  }

  if (provider === "google") {
    const claims = await verifyGoogleIdToken(idToken);
    if (!claims.email) throw new AuthIdentityError(400, "No email on token");
    return {
      email: claims.email,
      name: claims.name,
      googleSub: claims.sub,
      authProvider: "google",
      tokenEmailVerified: initialEmailVerifiedForSignup("google", claims),
    };
  }

  const claims = await verifyFirebaseIdToken(idToken);
  if (!claims.email) throw new AuthIdentityError(400, "No email on token");

  const authProvider = isGoogleAuthProvider("firebase", claims) ? "google" : "firebase";
  return {
    email: claims.email,
    name: claims.name,
    firebaseUid: claims.user_id,
    authProvider,
    tokenEmailVerified: emailVerifiedFromFirebaseClaims(claims, authProvider),
  };
}

export class AuthIdentityError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function findUserForIdentity(
  identity: AuthProviderIdentity,
): Promise<UserDocument | null> {
  if (identity.firebaseUid) {
    const byUid = await UserModel.findOne({ firebaseUid: identity.firebaseUid });
    if (byUid) return byUid;
  }
  if (identity.googleSub) {
    const bySub = await UserModel.findOne({ googleSub: identity.googleSub });
    if (bySub) return bySub;
  }
  return UserModel.findOne({ email: identity.email });
}

function fallbackName(email: string) {
  const [local] = email.split("@");
  return local || "User";
}

/**
 * Login-only sync. Never downgrades `google` to `firebase`.
 */
export function applyLoginIdentitySync(
  user: UserDocument,
  identity: AuthProviderIdentity,
): boolean {
  let changed = false;

  const touch = () => {
    changed = true;
  };

  user.lastLoginDate = new Date();
  touch();

  if (identity.firebaseUid && user.firebaseUid !== identity.firebaseUid) {
    user.firebaseUid = identity.firebaseUid;
    touch();
  }
  if (identity.googleSub && user.googleSub !== identity.googleSub) {
    user.googleSub = identity.googleSub;
    touch();
  }

  if (identity.authProvider === "google") {
    if (user.authProvider !== "google") {
      user.authProvider = "google";
      touch();
    }
    if (!user.emailVerified) {
      user.emailVerified = true;
      touch();
    }
    return changed;
  }

  if (user.authProvider === "google") {
    return changed;
  }

  if (identity.tokenEmailVerified && !user.emailVerified) {
    user.emailVerified = true;
    touch();
  }
  if (!user.authProvider || user.authProvider === "local") {
    user.authProvider = "firebase";
    touch();
  }

  return changed;
}

export function applyNewUserIdentity(
  user: UserDocument,
  identity: AuthProviderIdentity,
  reqBody: Record<string, unknown>,
) {

  user.email = identity.email;
  user.name = identity.name || user.name || fallbackName(identity.email);
  user.authProvider = identity.authProvider;
  user.mode = "customer";
  user.emailVerified = identity.tokenEmailVerified;
  user.lastLoginDate = new Date();
  if (identity.firebaseUid) user.firebaseUid = identity.firebaseUid;
  if (identity.googleSub) user.googleSub = identity.googleSub;
  applyUserLocaleFields(user, reqBody);
}
