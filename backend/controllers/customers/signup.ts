import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import UserModel from "../../models/user";
import { signAccessToken, signRefreshToken } from "../../lib/jwt";
import { verifyFirebaseIdToken } from "../../lib/verifyFirebaseIdToken";
import { verifyGoogleIdToken } from "../../lib/verifyGoogleIdToken";

function fallbackName(email?: string) {
  if (!email) return "User";
  const [local] = email.split("@");
  return local || "User";
}

export async function signup(req: Request, res: Response) {
  try {
    const provider = (req.body?.provider as string | undefined) || "firebase";
    const idToken = req.body?.idToken as string | undefined;
    if (!idToken) return res.status(400).json({ message: "Missing idToken" });

    let email: string | undefined;
    let name: string | undefined;
    let firebaseUid: string | undefined;
    let googleSub: string | undefined;
    let authProvider: "firebase" | "google";

    if (provider === "google") {
      const claims = await verifyGoogleIdToken(idToken);
      email = claims.email;
      name = claims.name;
      googleSub = claims.sub;
      authProvider = "google";
    } else {
      const claims = await verifyFirebaseIdToken(idToken);
      email = claims.email;
      name = claims.name;
      firebaseUid = claims.user_id;
      authProvider = "firebase";
    }

    if (!email) return res.status(400).json({ message: "No email on token" });

    const existing =
      (firebaseUid ? await UserModel.findOne({ firebaseUid }) : null) ||
      (googleSub ? await UserModel.findOne({ googleSub }) : null) ||
      (await UserModel.findOne({ email }));

    const isNewUser = !existing;
    const user = existing || new UserModel();

    user.email = email;
    user.name = name || user.name || fallbackName(email);
    user.authProvider = authProvider;
    if (firebaseUid) user.firebaseUid = firebaseUid;
    if (googleSub) user.googleSub = googleSub;
    user.lastLoginDate = new Date();

    await user.save();

    const refreshToken = signRefreshToken(String(user._id));
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await user.save();

    const accessToken = signAccessToken({ sub: String(user._id), role: user.role });

    res.cookie?.("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return res.status(200).json({
      isNewUser,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    return res.status(401).json({ message: "Signup failed" });
  }
}