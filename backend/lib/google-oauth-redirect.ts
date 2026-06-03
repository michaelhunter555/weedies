/** Allowed redirect URIs for Google OAuth code exchange (sign-in client). */
export function isAllowedGoogleOAuthRedirectUri(uri: string): boolean {
  const normalized = uri.trim();
  const allowed = new Set<string>();

  const clientOrigin = process.env.CLIENT_ORIGIN?.trim();
  if (clientOrigin) {
    for (const part of clientOrigin.split(",")) {
      const base = part.trim().replace(/\/$/, "");
      if (base) allowed.add(`${base}/callback/google`);
    }
  }

  allowed.add("http://localhost:3000/callback/google");
  allowed.add("https://dapandflip.com/callback/google");
  allowed.add(
    "https://dap-and-flip-56c4b64a323f.herokuapp.com/callback/google",
  );

  return allowed.has(normalized);
}
