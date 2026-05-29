import type { FirebaseIdTokenClaims } from "./verifyFirebaseIdToken";
import type { GoogleIdTokenClaims } from "./verifyGoogleIdToken";

/** Google OAuth (direct or via Firebase `google.com` provider). */
export function isGoogleAuthProvider(
  authProvider: "firebase" | "google",
  firebaseClaims?: Pick<FirebaseIdTokenClaims, "firebase">,
): boolean {
  if (authProvider === "google") return true;
  return firebaseClaims?.firebase?.sign_in_provider === "google.com";
}

export function emailVerifiedFromGoogleClaims(claims: GoogleIdTokenClaims): boolean {
  return claims.email_verified !== false;
}

export function emailVerifiedFromFirebaseClaims(
  claims: FirebaseIdTokenClaims,
  authProvider: "firebase" | "google",
): boolean {
  if (isGoogleAuthProvider(authProvider, claims)) {
    return claims.email_verified !== false;
  }
  return Boolean(claims.email_verified);
}

/** Initial `emailVerified` for a brand-new account. */
export function initialEmailVerifiedForSignup(
  authProvider: "firebase" | "google",
  claims: FirebaseIdTokenClaims | GoogleIdTokenClaims,
): boolean {
  if (authProvider === "google") {
    return emailVerifiedFromGoogleClaims(claims as GoogleIdTokenClaims);
  }
  return emailVerifiedFromFirebaseClaims(
    claims as FirebaseIdTokenClaims,
    authProvider,
  );
}
