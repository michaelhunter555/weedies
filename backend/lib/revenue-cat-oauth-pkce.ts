import crypto from "crypto";

function base64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function createPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64Url(crypto.randomBytes(32));
  const digest = crypto.createHash("sha256").update(codeVerifier).digest();
  const codeChallenge = base64Url(digest);
  return { codeVerifier, codeChallenge };
}
