import type { Request, Response } from "express";
import UserModel from "../../models/user";
import { getCookie } from "../../utils/cookies";
import { verifyRefreshToken } from "../../lib/jwt";

export async function logout(req: Request, res: Response) {
  try {
    const incoming = (req.body?.refreshToken as string | undefined) || getCookie(req, "refreshToken");
    if (incoming) {
      try {
        const payload = verifyRefreshToken(incoming);
        await UserModel.findByIdAndUpdate(payload.sub, { refreshTokenHash: null });
      } catch {
        // ignore invalid refresh token on logout
      }
    }

    res.cookie?.("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(200).json({ ok: true });
  }
}