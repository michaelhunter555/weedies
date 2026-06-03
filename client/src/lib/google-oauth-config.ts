/** sessionStorage key: "login" | "signup" before Google redirect */
export const GOOGLE_OAUTH_INTENT_KEY = "dapandflip.googleOAuthIntent";

export function googleOAuthRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/callback/google`;
}
