"use client";

import { useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AuthContext } from "@/context/auth-context";
import { needsEmailVerification } from "../../../types";
import {
  emailVerificationAllowedPath,
  VERIFY_EMAIL_PATH,
} from "@/lib/email-verification";

/** Redirect unverified email/password users to `/verify-email` (client profile only). */
export function EmailVerificationGate({ children }: { children: React.ReactNode }) {
  const { hydrated, isLoggedIn, user } = useContext(AuthContext);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated || !isLoggedIn || !user) return;
    if (!needsEmailVerification(user)) return;
    if (emailVerificationAllowedPath(pathname)) return;
    router.replace(VERIFY_EMAIL_PATH);
  }, [hydrated, isLoggedIn, user, pathname, router]);

  return <>{children}</>;
}
