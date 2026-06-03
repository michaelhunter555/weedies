import { initialEmailVerifiedForSignup } from "./user-email-verified";
import { verifyGoogleIdToken, type GoogleIdTokenClaims } from "./verifyGoogleIdToken";
import type { AuthProviderIdentity } from "./auth-provider-identity";

export async function googleIdentityFromIdToken(
  idToken: string,
): Promise<AuthProviderIdentity> {
  const claims = await verifyGoogleIdToken(idToken);
  if (!claims.email) {
    throw new Error("No email on Google account");
  }
  return {
    email: claims.email,
    name: claims.name,
    googleSub: claims.sub,
    authProvider: "google",
    tokenEmailVerified: initialEmailVerifiedForSignup("google", claims),
  };
}

export type { GoogleIdTokenClaims };
