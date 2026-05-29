import type { Response } from "express";
import bcrypt from "bcrypt";
import type { HydratedDocument } from "mongoose";
import type { User } from "../models/user";
import { signAccessToken, signRefreshToken } from "./jwt";
import { toAppUserJson } from "./serialize-app-user";

export type UserDocument = HydratedDocument<User>;

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 1000 * 60 * 60 * 24 * 30,
};

/** Issue access + refresh JWTs, persist refresh hash, set httpOnly cookie. */
export async function issueUserSession(
  res: Response,
  user: UserDocument,
  opts?: { isNewUser?: boolean },
) {
  const refreshToken = signRefreshToken(String(user._id));
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save();

  const accessToken = signAccessToken({
    sub: String(user._id),
    role: user.role,
  });

  res.cookie?.("refreshToken", refreshToken, REFRESH_COOKIE_OPTS);

  return {
    isNewUser: opts?.isNewUser ?? false,
    user: toAppUserJson(user),
    accessToken,
    refreshToken,
  };
}
