import { OAuth2Client } from "google-auth-library";

export type GoogleIdTokenClaims = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
};

let client: OAuth2Client | null = null;

export async function verifyGoogleIdToken(idToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Missing GOOGLE_CLIENT_ID env var");

  if (!client) client = new OAuth2Client(clientId);

  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub) throw new Error("Invalid Google token payload");
  return payload as GoogleIdTokenClaims;
}


