import { createRemoteJWKSet, jwtVerify } from "jose";

export type FirebaseIdTokenClaims = {
  user_id: string;
  email?: string;
  name?: string;
  picture?: string;
  firebase?: {
    sign_in_provider?: string;
  };
};

const jwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export async function verifyFirebaseIdToken(idToken: string) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Missing FIREBASE_PROJECT_ID env var");

  const { payload } = await jwtVerify(idToken, jwks, {
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });

  return payload as unknown as FirebaseIdTokenClaims & {
    sub: string;
    aud: string;
    iss: string;
    exp: number;
    iat: number;
  };
}


