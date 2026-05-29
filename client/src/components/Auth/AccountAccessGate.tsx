"use client";

import { useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AuthContext } from "@/context/auth-context";
import { isAccountRestricted } from "../../../types";

/** Routes restricted accounts may still visit. */
const ALLOWED_PREFIXES = [
  "/account-restricted",
  "/contact-us",
  "/privacy-policy",
  "/terms-of-service",
  "/support",
];

function pathAllowed(pathname: string): boolean {
  return ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Redirects suspended/banned users to `/account-restricted` while keeping
 * legal and contact pages available.
 */
export function AccountAccessGate({ children }: { children: React.ReactNode }) {
  const { hydrated, isLoggedIn, user } = useContext(AuthContext);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated || !isLoggedIn || !user) return;
    if (!isAccountRestricted(user.accountStanding)) return;
    if (pathAllowed(pathname)) return;
    router.replace("/account-restricted");
  }, [hydrated, isLoggedIn, user, pathname, router]);

  return <>{children}</>;
}
