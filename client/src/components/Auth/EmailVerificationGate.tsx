"use client";

import { useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AuthContext } from "@/context/auth-context";
import {
  shouldRedirectToVerifyEmail,
  VERIFY_EMAIL_PATH,
} from "@/lib/email-verification";

/**
 * Redirects email/password users who have not verified their inbox yet.
 * Waits for `sessionReady` so we do not act on a stale localStorage profile.
 */
export function EmailVerificationGate({ children }: { children: React.ReactNode }) {
  const { hydrated, sessionReady, isLoggedIn, user } = useContext(AuthContext);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated || !sessionReady || !isLoggedIn || !user) return;
    if (!shouldRedirectToVerifyEmail(user, pathname)) return;
    router.replace(VERIFY_EMAIL_PATH);
  }, [hydrated, sessionReady, isLoggedIn, user, pathname, router]);

  return <>{children}</>;
}
