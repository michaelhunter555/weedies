import type { Request, Response } from "express";
import mongoose from "mongoose";
import UserModel from "../../models/user";
import { verifyFirebaseIdToken } from "../../lib/verifyFirebaseIdToken";
import { isGoogleAuthProvider } from "../../lib/user-email-verified";
import { toAppUserJson } from "../../lib/serialize-app-user";

/**
 * Sync Mongo verification state from a fresh Firebase ID token.
 * - Google (Firebase `google.com`): mark verified, fix legacy `authProvider`.
 * - Email/password: require `email_verified` on the token.
 * - Already verified in DB: idempotent success (no idToken required).
 */
export async function confirmEmailVerified(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    if (!mongoose.isValidObjectId(userId)) {
      return void res.status(401).json({ message: "Invalid session" });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return void res.status(404).json({ message: "User not found" });
    }

    if (user.emailVerified && user.authProvider === "google") {
      return void res.status(200).json({
        user: toAppUserJson(user),
        resolved: "already",
      });
    }

    const idToken = req.body?.idToken as string | undefined;

    if (user.emailVerified && !idToken) {
      return void res.status(200).json({
        user: toAppUserJson(user),
        resolved: "already",
      });
    }

    if (!idToken) {
      return void res.status(400).json({ message: "Missing idToken" });
    }

    const claims = await verifyFirebaseIdToken(idToken);
    const signedInWithGoogle = isGoogleAuthProvider("firebase", claims);

    if (user.firebaseUid && user.firebaseUid !== claims.user_id) {
      return void res.status(403).json({ message: "Token does not match this user" });
    }

    if (!user.firebaseUid) {
      user.firebaseUid = claims.user_id;
    }

    if (signedInWithGoogle || user.authProvider === "google") {
      user.authProvider = "google";
      user.emailVerified = true;
      await user.save();
      return void res.status(200).json({
        user: toAppUserJson(user),
        resolved: "google",
      });
    }

    if (!claims.email_verified) {
      return void res.status(400).json({
        message: "Email not verified yet. Open the link in your inbox, then try again.",
      });
    }

    user.emailVerified = true;
    await user.save();

    return void res.status(200).json({
      user: toAppUserJson(user),
      resolved: "email",
    });
  } catch (err) {
    console.log("confirmEmailVerified error", err);
    return void res.status(401).json({ message: "Could not confirm email verification" });
  }
}
