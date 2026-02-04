import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import UserModel from "../../models/user";
import { getCookie } from "../../utils/cookies";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt";

export async function refresh(req: Request, res: Response) {
  try {
    const incoming = (req.body?.refreshToken as string | undefined) || getCookie(req, "refreshToken");
    if (!incoming) return res.status(401).json({ message: "Missing refresh token" });

    const payload = verifyRefreshToken(incoming);
    if (payload.typ !== "refresh") return res.status(401).json({ message: "Invalid refresh token" });

    const user = await UserModel.findById(payload.sub);
    if (!user?.refreshTokenHash) return res.status(401).json({ message: "Refresh token revoked" });

    const ok = await bcrypt.compare(incoming, user.refreshTokenHash);
    if (!ok) return res.status(401).json({ message: "Refresh token mismatch" });

    const newRefresh = signRefreshToken(String(user._id));
    user.refreshTokenHash = await bcrypt.hash(newRefresh, 10);
    await user.save();

    const accessToken = signAccessToken({ sub: String(user._id), role: user.role });

    res.cookie?.("refreshToken", newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return res.status(200).json({
      accessToken,
      refreshToken: newRefresh,
    });
  } catch (err) {
    return res.status(401).json({ message: "Could not refresh session" });
  }
}


