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
import { APP_NAME } from "@/brand";
import {
  BRAND_PALETTE,
  brandContainedButtonSx,
} from "@/theme/brand-palette";

export default function VerifyEmailPage() {
  const router = useRouter();
  const authCtx = useContext(AuthContext);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [resolving, setResolving] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isGoogleSession, setIsGoogleSession] = useState(false);

  const email = authCtx.user?.email ?? "";

  const syncFromFirebaseToken = async (fbUser: FirebaseUser) => {
    const apiBase = buildApiBase();
    if (!apiBase) throw new Error("Missing API configuration");

    const idToken = await fbUser.getIdToken(true);
    const accessToken = authCtx.accessToken;
    if (!accessToken) throw new Error("Sign in again to continue.");

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
      authCtx.update(data.user);
    }
    await authCtx.syncUserFromServer();
  };

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
      const msg = e instanceof Error ? e.message : "Could not resend email";
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  const finishAndGoHome = () => {
    router.replace("/");
  };

  const handleContinue = async () => {
    setError(null);
    setInfo(null);
    setChecking(true);
    try {
      const fbUser = firebaseAuth.currentUser;
      if (!fbUser) {
        throw new Error("Sign in again, then return to this page.");
      }

      const google = isFirebaseGoogleSignIn(fbUser);

      if (google) {
        await syncFromFirebaseToken(fbUser);
        finishAndGoHome();
        return;
      }

      await reload(fbUser);

      if (!fbUser.emailVerified) {
        setError(
          "We still do not see a verified email. Open the link Firebase sent you, then try again.",
        );
        return;
      }

      await syncFromFirebaseToken(fbUser);
      finishAndGoHome();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not continue";
      setError(msg);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!authCtx.hydrated) return;
    if (!authCtx.isLoggedIn) {
      router.replace("/signup");
      return;
    }

    let cancelled = false;

    void (async () => {
      setResolving(true);
      try {
        const synced = await authCtx.syncUserFromServer();
        const user = synced ?? authCtx.user;
        if (!needsEmailVerification(user)) {
          if (!cancelled) router.replace("/");
          return;
        }

        const fbUser = firebaseAuth.currentUser;
        const google = isFirebaseGoogleSignIn(fbUser);
        if (!cancelled) setIsGoogleSession(google);

        if (google && fbUser) {
          await syncFromFirebaseToken(fbUser);
          if (!cancelled) router.replace("/");
        }
      } catch {
        // User can still press Continue manually.
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authCtx.hydrated,
    authCtx.isLoggedIn,
    authCtx.user,
    authCtx.syncUserFromServer,
    authCtx.update,
    router,
  ]);

  if (resolving && authCtx.hydrated && authCtx.isLoggedIn) {
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
            disabled={checking || !authCtx.isLoggedIn}
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
            onClick={() => void authCtx.logout().then(() => router.replace("/signup"))}
            sx={{ textTransform: "none" }}
          >
            Sign out and use a different account
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
