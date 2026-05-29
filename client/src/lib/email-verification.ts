import { needsEmailVerification, type UserObject } from "../../types";

export { needsEmailVerification };

export const VERIFY_EMAIL_PATH = "/verify-email";

export function isVerifyEmailPath(pathname: string): boolean {
  return pathname === VERIFY_EMAIL_PATH || pathname.startsWith(`${VERIFY_EMAIL_PATH}/`);
}

/** Routes reachable while waiting on email verification. */
export function emailVerificationAllowedPath(pathname: string): boolean {
  if (isVerifyEmailPath(pathname)) return true;
  return (
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/account-restricted" ||
    pathname === "/contact-us" ||
    pathname.startsWith("/contact-us/") ||
    pathname === "/privacy-policy" ||
    pathname === "/terms-of-service" ||
    pathname === "/support" ||
    pathname.startsWith("/support/")
  );
}

export function shouldRedirectToVerifyEmail(
  user: UserObject | null | undefined,
  pathname: string,
): boolean {
  if (!needsEmailVerification(user)) return false;
  return !emailVerificationAllowedPath(pathname);
}
