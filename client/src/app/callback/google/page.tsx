"use client";

import { Suspense, useContext, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, CircularProgress, Typography } from "@mui/material";

import { AuthContext } from "@/context/auth-context";
import { GOOGLE_OAUTH_INTENT_KEY, googleOAuthRedirectUri } from "@/lib/google-oauth-config";
import { needsEmailVerification } from "../../../../types";
import { VERIFY_EMAIL_PATH } from "@/lib/email-verification";

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<GoogleCallbackFallback message="Finishing Google sign-in…" />}>
      <GoogleCallbackPageContent />
    </Suspense>
  );
}

function GoogleCallbackFallback({ message }: { message: string }) {
  return (
    <Box
      sx={{
        minHeight: "50vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        px: 2,
      }}
    >
      <CircularProgress size={32} />
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );
}

function GoogleCallbackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authCtx = useContext(AuthContext);
  const [message, setMessage] = useState("Finishing Google sign-in…");

  const code = searchParams.get("code")?.trim() ?? "";
  const oauthError = searchParams.get("error")?.trim() ?? "";
  const redirectUri = useMemo(() => googleOAuthRedirectUri(), []);

  useEffect(() => {
    if (oauthError) {
      setMessage("Google sign-in was cancelled.");
      return;
    }
    if (!code) {
      setMessage("Missing authorization code. Return to sign in and try again.");
      return;
    }
    if (!redirectUri) return;

    let cancelled = false;

    (async () => {
      let intent: "login" | "signup" = "login";
      try {
        const stored = sessionStorage.getItem(GOOGLE_OAUTH_INTENT_KEY);
        if (stored === "signup" || stored === "login") intent = stored;
        sessionStorage.removeItem(GOOGLE_OAUTH_INTENT_KEY);
      } catch {
        /* ignore */
      }

      try {
        const { user } = await authCtx.completeGoogleOAuthRedirect(
          code,
          redirectUri,
          intent,
        );
        if (cancelled) return;
        setMessage("Signed in. Redirecting…");
        router.replace(needsEmailVerification(user) ? VERIFY_EMAIL_PATH : "/");
      } catch (err) {
        if (!cancelled) {
          setMessage(
            err instanceof Error ? err.message : "Google sign-in failed",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, oauthError, redirectUri, router, authCtx]);

  return <GoogleCallbackFallback message={message} />;
}
