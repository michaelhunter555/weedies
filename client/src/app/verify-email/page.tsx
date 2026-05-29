"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  reload,
  sendEmailVerification,
  type User as FirebaseUser,
} from "firebase/auth";

import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { AuthContext, buildApiBase } from "@/context/auth-context";
import { auth as firebaseAuth } from "@/lib/firebase";
import { isFirebaseGoogleSignIn } from "@/lib/firebase-auth-providers";
import { needsEmailVerification } from "@/lib/email-verification";
import type { UserObject } from "../../../types";
import { APP_NAME } from "@/brand";
import {
  BRAND_PALETTE,
  brandContainedButtonSx,
} from "@/theme/brand-palette";

type Phase = "boot" | "form";

async function confirmWithFirebase(
  fbUser: FirebaseUser,
  accessToken: string,
  update: (user: UserObject) => void,
  syncUserFromServer: () => Promise<UserObject | null>,
) {
  const apiBase = buildApiBase();
  if (!apiBase) throw new Error("Missing API configuration");

  const idToken = await fbUser.getIdToken(true);
  const resp = await fetch(`${apiBase}/user/confirm-email-verified`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
    body: JSON.stringify({ idToken }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(
      (data?.message as string) || "Could not update your account.",
    );
  }

  if (data?.user) {
    update(data.user as UserObject);
  }
  await syncUserFromServer();
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const auth = useContext(AuthContext);
  const [phase, setPhase] = useState<Phase>("boot");
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const email = auth.user?.email ?? "";
  const isGoogleSession =
    auth.user?.authProvider === "google" ||
    isFirebaseGoogleSignIn(firebaseAuth.currentUser);

  // Boot once when auth is ready — no user object in the dependency list.
  useEffect(() => {
    if (!auth.hydrated) return;
    if (!auth.isLoggedIn) {
      router.replace("/signup");
      return;
    }
    if (!auth.sessionReady) return;

    let cancelled = false;

    void (async () => {
      const fresh = await auth.syncUserFromServer();
      if (cancelled) return;

      const profile = fresh ?? auth.user;
      if (!profile?.id) {
        setError("Could not load your profile. Sign out and sign in again.");
        setPhase("form");
        return;
      }

      if (!needsEmailVerification(profile)) {
        router.replace("/");
        return;
      }

      setPhase("form");
    })();

    return () => {
      cancelled = true;
    };
  }, [auth.hydrated, auth.sessionReady, auth.isLoggedIn, router]);

  const goHome = () => router.replace("/");

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      const fbUser = firebaseAuth.currentUser;
      if (!fbUser) {
        throw new Error("Sign in again to resend the verification email.");
      }
      if (isFirebaseGoogleSignIn(fbUser)) {
        setInfo("You signed in with Google. Use Continue below instead.");
        return;
      }
      await sendEmailVerification(fbUser);
      setInfo("Verification email sent. Check your inbox and spam folder.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not resend email");
    } finally {
      setResending(false);
    }
  };

  const handleContinue = async () => {
    setError(null);
    setInfo(null);
    setChecking(true);
    try {
      const fresh = await auth.syncUserFromServer();
      const profile = fresh ?? auth.user;

      if (!profile?.id) {
        throw new Error("Could not load your profile. Sign out and sign in again.");
      }

      if (!needsEmailVerification(profile)) {
        goHome();
        return;
      }

      if (profile.authProvider === "google") {
        goHome();
        return;
      }

      const fbUser = firebaseAuth.currentUser;
      if (!fbUser) {
        throw new Error("Sign in again, then return to this page.");
      }

      if (isFirebaseGoogleSignIn(fbUser)) {
        if (!auth.accessToken) throw new Error("Sign in again to continue.");
        await confirmWithFirebase(
          fbUser,
          auth.accessToken,
          auth.update,
          auth.syncUserFromServer,
        );
        goHome();
        return;
      }

      await reload(fbUser);
      if (!fbUser.emailVerified) {
        setError(
          "We still do not see a verified email. Open the link Firebase sent you, then try again.",
        );
        return;
      }

      if (!auth.accessToken) throw new Error("Sign in again to continue.");
      await confirmWithFirebase(
        fbUser,
        auth.accessToken,
        auth.update,
        auth.syncUserFromServer,
      );
      goHome();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not continue");
    } finally {
      setChecking(false);
    }
  };

  if (phase === "boot") {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Checking your account…</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        py: { xs: 4, md: 8 },
        px: { xs: 2, sm: 3 },
        minHeight: "50vh",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 440,
          p: { xs: 3, sm: 4 },
          borderRadius: 4,
          border: `1px solid ${BRAND_PALETTE.borderSubtle}`,
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={2.5} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: BRAND_PALETTE.mint,
              color: BRAND_PALETTE.seafoam,
            }}
          >
            <MailOutlineRoundedIcon fontSize="large" />
          </Box>

          <Stack spacing={0.75}>
            <Typography variant="h5" fontWeight={900}>
              {isGoogleSession ? "Almost done" : "Verify your email"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isGoogleSession ? (
                <>
                  You signed in with Google on {APP_NAME}. Email verification is
                  not required. Press continue to enter the app.
                </>
              ) : (
                <>
                  We sent a verification link to{" "}
                  <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                    {email || "your email"}
                  </Box>
                  . Open it, then press the button below.
                </>
              )}
            </Typography>
          </Stack>

          {error ? (
            <Alert severity="error" sx={{ width: "100%", textAlign: "left" }}>
              {error}
            </Alert>
          ) : null}
          {info ? (
            <Alert severity="success" sx={{ width: "100%", textAlign: "left" }}>
              {info}
            </Alert>
          ) : null}

          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={checking || !auth.isLoggedIn}
            onClick={() => void handleContinue()}
            sx={{ borderRadius: 2, ...brandContainedButtonSx }}
          >
            {checking
              ? "Checking…"
              : isGoogleSession
                ? "Continue to app"
                : "I verified my email"}
          </Button>

          {!isGoogleSession ? (
            <>
              <Typography variant="caption" color="text.secondary">
                Only press after you opened the link in your inbox.
              </Typography>

              <Button
                variant="text"
                size="small"
                disabled={resending}
                onClick={() => void handleResend()}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {resending ? "Sending…" : "Resend verification email"}
              </Button>
            </>
          ) : null}

          <Button
            variant="text"
            size="small"
            color="inherit"
            onClick={() => void auth.logout().then(() => router.replace("/signup"))}
            sx={{ textTransform: "none" }}
          >
            Sign out and use a different account
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
