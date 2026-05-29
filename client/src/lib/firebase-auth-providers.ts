import type { User as FirebaseUser } from "firebase/auth";

/** True when this Firebase session used Google (popup, redirect, or link). */
export function isFirebaseGoogleSignIn(fbUser: FirebaseUser | null | undefined): boolean {
  if (!fbUser) return false;
  return fbUser.providerData.some((p) => p.providerId === "google.com");
}
