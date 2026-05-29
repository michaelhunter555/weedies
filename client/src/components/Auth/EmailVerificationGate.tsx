"use client";

import { useContext, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AuthContext } from "@/context/auth-context";
import {
  shouldRedirectToVerifyEmail,
  VERIFY_EMAIL_PATH,
} from "@/lib/email-verification";

/**
 * Sends unverified users to `/verify-email` once per session after profile sync.
 */
export function EmailVerificationGate({ children }: { children: React.ReactNode }) {
  const { hydrated, sessionReady, isLoggedIn, user, syncUserFromServer } =
    useContext(AuthContext);
  const pathname = usePathname();
  const router = useRouter();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || !sessionReady) return;
    if (!isLoggedIn) {
      checkedRef.current = false;
      return;
    }
    if (checkedRef.current) return;
    checkedRef.current = true;

    void (async () => {
      const fresh = await syncUserFromServer();
      const profile = fresh ?? user;
      if (!profile) return;
      if (!shouldRedirectToVerifyEmail(profile, pathname)) return;
      router.replace(VERIFY_EMAIL_PATH);
    })();
  }, [hydrated, sessionReady, isLoggedIn, pathname, router, syncUserFromServer, user]);

  return <>{children}</>;
}
