import * as jwt from "jsonwebtoken";

export type AppRole = "user" | "admin";

export type AppVerificationTokenPayload = {
  typ: "app_verification";
  sub: string; // listing id
  sellerId: string;
};

export type AccessTokenPayload = {
  sub: string; // user id
  role: AppRole;
};

export type RefreshTokenPayload = {
  sub: string; // user id
  typ: "refresh";
};

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} env var`);
  return v;
}

export function signAppVerificationToken(payload: AppVerificationTokenPayload) {
  const secret = mustGetEnv("JWT_APP_VERIFICATION_SECRET");
  const expiresIn = Number(30 * 24 * 60 * 60); // 30 days
  return jwt.sign(payload, secret, { expiresIn });
}

export function signAccessToken(payload: AccessTokenPayload) {
  const secret = mustGetEnv("JWT_ACCESS_SECRET");
  const expiresIn = Number(process.env.JWT_ACCESS_EXPIRES_SECONDS || 15 * 60);
  return jwt.sign(payload, secret, { expiresIn });
}

export function signRefreshToken(userId: string) {
  const secret = mustGetEnv("JWT_REFRESH_SECRET");
  const expiresIn = Number(process.env.JWT_REFRESH_EXPIRES_SECONDS || 30 * 24 * 60 * 60);
  const payload: RefreshTokenPayload = { sub: userId, typ: "refresh" };
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyAccessToken(token: string) {
  const secret = mustGetEnv("JWT_ACCESS_SECRET");
  return jwt.verify(token, secret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string) {
  const secret = mustGetEnv("JWT_REFRESH_SECRET");
  return jwt.verify(token, secret) as RefreshTokenPayload;
}

export function verifyAppVerificationToken(token: string) {
  const secret = mustGetEnv("JWT_APP_VERIFICATION_SECRET");
  const payload = jwt.verify(token, secret) as AppVerificationTokenPayload;
  if (payload.typ !== "app_verification") {
    throw new jwt.JsonWebTokenError("Invalid app verification token type");
  }
  return payload;
}


