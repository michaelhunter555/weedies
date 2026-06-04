"use client";
import { useContext, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { GoogleLogin } from "@react-oauth/google";

import { AuthContext } from "@/context/auth-context";
import { useForm } from "@/hooks/useForm";
import { auth as firebaseAuth } from "@/lib/firebase";
import { APP_NAME } from "@/brand";
import {
  BRAND_PALETTE,
  brandContainedButtonSx,
  brandLogoMarkSx,
} from "@/theme/brand-palette";

import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import LockIcon from "@mui/icons-material/Lock";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Grid from "@mui/material/Grid2";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import LinearProgress from "@mui/material/LinearProgress";
import MuiCard from "@mui/material/Card";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import Lottie from "lottie-react";
import dapandflip from "@/lib/lottiejson/dapandflip.json";

import { needsEmailVerification, type UserProps } from "../../../types";
import { VERIFY_EMAIL_PATH } from "@/lib/email-verification";
import { loginFields } from "./formFields";

const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  padding: theme.spacing(3),
  gap: theme.spacing(2),
  borderRadius: 20,
  border: "1px solid #ececec",
  boxShadow:
    "0 1px 2px rgba(17,17,17,0.04), 0 12px 32px -8px rgba(17,17,17,0.08)",
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(5),
  },
}));

const validateEmail = (email: string) =>
  /^\w+([.\-+]\w+)*@\w+([.\-]\w+)*\.\w{2,}$/.test(email);

function passwordStrength(pw: string): { score: number; label: string; color: "error" | "warning" | "info" | "success" } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length >= 12) s++;
  const map: Record<number, { label: string; color: "error" | "warning" | "info" | "success" }> = {
    0: { label: "Too short", color: "error" },
    1: { label: "Weak", color: "error" },
    2: { label: "Fair", color: "warning" },
    3: { label: "Good", color: "info" },
    4: { label: "Strong", color: "success" },
    5: { label: "Excellent", color: "success" },
  };
  return { score: (s / 5) * 100, ...map[s] };
}

const LoginForm = () => {
  const authCtx = useContext(AuthContext);
  const router = useRouter();

  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [formState, inputHandler, setFormData] = useForm(loginFields, false);

  // Already signed in on /signup → home, or verify-email if inbox not confirmed.
  useEffect(() => {
    if (!authCtx.hydrated || !authCtx.isLoggedIn || !authCtx.user) return;
    router.replace(
      needsEmailVerification(authCtx.user) ? VERIFY_EMAIL_PATH : "/",
    );
  }, [authCtx.hydrated, authCtx.isLoggedIn, authCtx.user, router]);

  const passwordValue = String(formState?.inputs?.password?.value || "");
  const pwMeter = useMemo(() => passwordStrength(passwordValue), [passwordValue]);

  const handleFormSubmit = async (event: React.FormEvent<HTMLElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const user: UserProps = {
      ...(formState?.inputs?.userName?.value
        ? { userName: formState?.inputs?.userName?.value as string }
        : {}),
      email: formState?.inputs?.email?.value as string,
      password: formState?.inputs?.password?.value as string,
    };

    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(
          firebaseAuth,
          user.email,
          user.password
        );
        const idToken = await cred.user.getIdToken();
        const { user: appUser } = await authCtx.loginWithProviderToken(
          "firebase",
          idToken,
        );
        router.replace(
          needsEmailVerification(appUser) ? VERIFY_EMAIL_PATH : "/",
        );
        return;
      } else {
        const cred = await createUserWithEmailAndPassword(
          firebaseAuth,
          user.email,
          user.password
        );
        // Set displayName on the Firebase account so the backend signup
        // controller (backend/controllers/customers/signup.ts) can pick it
        // up from `claims.name` when verifying the Firebase ID token.
        if (user.userName) {
          try {
            await updateProfile(cred.user, { displayName: user.userName });
          } catch {
            // non-fatal - backend will fall back to the email local part
          }
        }
        // Force refresh so the new displayName is included in the ID token claims
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // non-fatal; user can resend from verify page
        }
        const idToken = await cred.user.getIdToken(true);
        try {
          await authCtx.signupWithProviderToken("firebase", idToken);
        } catch (signupErr: unknown) {
          const code =
            signupErr &&
            typeof signupErr === "object" &&
            "code" in signupErr
              ? String((signupErr as { code?: string }).code)
              : "";
          if (code !== "ACCOUNT_EXISTS") throw signupErr;
          await authCtx.loginWithProviderToken("firebase", idToken);
        }
        setFormData(loginFields, false);
        router.replace(VERIFY_EMAIL_PATH);
        return;
      }
    } catch (e: any) {
      setError(e?.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuthOptions = () => {
    setError(null);
    setInfo(null);
    // Compute next state outside of setIsLogin's updater - updater fns must
    // be pure; calling setFormData inside one can fire multiple times under
    // React concurrent/strict rendering.
    const nextIsLogin = !isLogin;
    const currentEmail = String(formState?.inputs?.email?.value || "");
    const currentPw = String(formState?.inputs?.password?.value || "");
    const currentName = String(formState?.inputs?.userName?.value || "");

    if (!nextIsLogin) {
      // Switching to Sign up - track the userName input so the form can't
      // be valid until the user provides a display name.
      setFormData(
        {
          userName: {
            value: currentName,
            isValid: currentName.trim().length > 1,
          },
          email: { value: currentEmail, isValid: validateEmail(currentEmail) },
          password: { value: currentPw, isValid: currentPw.length >= 8 },
        },
        currentName.trim().length > 1 &&
          validateEmail(currentEmail) &&
          currentPw.length >= 8
      );
    } else {
      // Switching back to Sign in - drop userName from the form state.
      setFormData(
        {
          email: { value: currentEmail, isValid: validateEmail(currentEmail) },
          password: { value: currentPw, isValid: currentPw.length > 0 },
        },
        validateEmail(currentEmail) && currentPw.length > 0
      );
    }
    setIsLogin(nextIsLogin);
  };

  const handleForgotPassword = async () => {
    const email = String(formState?.inputs?.email?.value || "").trim();
    if (!email) {
      setError("Enter your email first, then click 'Forgot your password?'");
      return;
    }
    try {
      const base = process.env.NEXT_PUBLIC_SERVER;
      if (!base) throw new Error("Missing NEXT_PUBLIC_SERVER");
      const apiBase = base.endsWith("/api") ? base : `${base}/api`;
      const resp = await fetch(`${apiBase}/user/password-reset`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!resp.ok) throw new Error("Could not send reset email");
      setInfo("Password reset email sent. Check your inbox.");
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Could not send reset email");
    }
  };

  /** Direct Google OAuth ID token → API `provider: "google"` (not Firebase). */
  const handleGoogleCredential = async (idToken: string) => {
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (isLogin) {
        const { user: appUser } = await authCtx.loginWithProviderToken(
          "google",
          idToken,
        );
        router.replace(
          needsEmailVerification(appUser) ? VERIFY_EMAIL_PATH : "/",
        );
      } else {
        try {
          const { user: appUser } = await authCtx.signupWithProviderToken(
            "google",
            idToken,
          );
          router.replace(
            needsEmailVerification(appUser) ? VERIFY_EMAIL_PATH : "/",
          );
        } catch (signupErr: unknown) {
          const code =
            signupErr &&
            typeof signupErr === "object" &&
            "code" in signupErr
              ? String((signupErr as { code?: string }).code)
              : "";
          if (code !== "ACCOUNT_EXISTS") throw signupErr;
          const { user: appUser } = await authCtx.loginWithProviderToken(
            "google",
            idToken,
          );
          router.replace(
            needsEmailVerification(appUser) ? VERIFY_EMAIL_PATH : "/",
          );
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const marketingPoints = [
    { icon: <BoltRoundedIcon fontSize="small" />, text: "List your app in 5 minutes. Let the world know you have something to offer." },
    { icon: <RocketLaunchRoundedIcon fontSize="small" />, text: "Painless onboarding with stripe. Keep up to 94% of revenue." },
    { icon: <VerifiedRoundedIcon fontSize="small" />, text: "Your first 3 listings are 100% free. No card on file required." },
    { icon: <LockIcon fontSize="small" />, text: "Safely purchase apps with curated handover flows designed to minimize risk." },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: { xs: "100%", sm: 480, md: 1080 },
        minWidth: 0,
        mx: "auto",
        boxSizing: "border-box",
      }}
    >
      <Grid
        container
        spacing={{ xs: 0, md: 4 }}
        alignItems="stretch"
        sx={{ width: "100%", minWidth: 0 }}
      >
        {/* Marketing side panel - desktop only */}
        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{ display: { xs: "none", md: "block" } }}
        >
          <Paper
            elevation={0}
            sx={{
              height: "100%",
              borderRadius: 5,
              p: { xs: 4, md: 5 },
              color: BRAND_PALETTE.charcoal,
              position: "relative",
              overflow: "hidden",
              backgroundColor: BRAND_PALETTE.mint,
              border: `1px solid ${BRAND_PALETTE.sage}`,
            }}
          >
            <Stack spacing={2} sx={{ height: "100%" }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                
                <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND_PALETTE.charcoal }}>
                  Dap & Flip
                </Typography>
                <Box
                  sx={{
                    width: 78,
                    height: 70,
                    flexShrink: 0,
                    lineHeight: 0,
                    "& > div": { width: "100% !important", height: "100% !important" },
                  }}
                >
                  <Lottie
                    animationData={dapandflip}
                    loop
                    style={{ width: "100%", height: "100%" }}
                  />
                </Box>
              </Stack>

              <Typography
                variant="h3"
                sx={{ fontWeight: 900, lineHeight: 1.1, mt: 2 }}
              >
                {isLogin ? (
                  <>
                    Welcome back,
                    
                  </>
                ) : (
                  <>
                    Buy and Sell{" "}
                    
                    Apps.
                  </>
                )}
              </Typography>

              <Typography sx={{ color: "rgba(37, 52, 58, 0.8)" }}>
                {isLogin
                  ? "Pick up where you left off - your library, sales and listings are ready."
                  : `Join indie creators shipping apps on ${APP_NAME}. 5 minutes to list your first app.`}
              </Typography>

              <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                {marketingPoints.map((p) => (
                  <Stack
                    key={p.text}
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1.5,
                        backgroundColor: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {p.icon}
                    </Box>
                    <Typography>
                      {p.text}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              <Stack
                direction="row"
                spacing={2}
                sx={{ mt: "auto", pt: 3, color: "rgba(255,255,255,0.85)" }}
              >
                <Stack>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    3,240+
                  </Typography>
                  <Typography variant="caption">apps listed</Typography>
                </Stack>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ borderColor: "rgba(255,255,255,0.2)" }}
                />
                <Stack>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    180k
                  </Typography>
                  <Typography variant="caption">monthly installs</Typography>
                </Stack>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ borderColor: "rgba(255,255,255,0.2)" }}
                />
                <Stack>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    $1.2M
                  </Typography>
                  <Typography variant="caption">paid to creators</Typography>
                </Stack>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        {/* Form side */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <Stack spacing={0.5}>
              <Chip
                label={isLogin ? "Sign in" : "Create account"}
                size="small"
                color="secondary"
                sx={{
                  width: "fit-content",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {isLogin ? "Welcome back" : `Join ${APP_NAME}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isLogin
                  ? "Sign in to continue to your dashboard."
                  : "It takes less than a minute. No credit card required."}
              </Typography>
            </Stack>

            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                opacity: submitting ? 0.6 : 1,
                pointerEvents: submitting ? "none" : "auto",
              }}
            >
              {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
                <GoogleLogin
                  onSuccess={(res) => {
                    if (!res.credential) {
                      setError("Google did not return a sign-in credential.");
                      return;
                    }
                    void handleGoogleCredential(res.credential);
                  }}
                  onError={() =>
                    setError("Google sign-in failed. Try again.")
                  }
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  width="100%"
                  text={isLogin ? "signin_with" : "signup_with"}
                  shape="pill"
                />
              ) : (
                <Alert severity="warning" sx={{ width: "100%" }}>
                  Google sign-in is not configured (missing{" "}
                  <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>).
                </Alert>
              )}
            </Box>

            <Divider sx={{ my: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                or continue with email
              </Typography>
            </Divider>

            <Box
              component="form"
              onSubmit={handleFormSubmit}
              noValidate
              sx={{ display: "flex", flexDirection: "column", width: "100%", gap: 2 }}
            >
              {error && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {error}
                </Alert>
              )}
              {info && !error && (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  {info}
                </Alert>
              )}

              {!isLogin && (
                <FormControl>
                  <FormLabel htmlFor="userName">Display name</FormLabel>
                  <TextField
                    fullWidth
                    name="userName"
                    id="userName"
                    type="text"
                    placeholder="e.g. Jordan from Lagos"
                    autoComplete="name"
                    variant="outlined"
                    value={formState?.inputs?.userName?.value || ""}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      inputHandler(
                        "userName",
                        event.target.value,
                        event.target.value.trim().length > 1
                      )
                    }
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                </FormControl>
              )}

              
                <FormLabel htmlFor="email">Email</FormLabel>
                <TextField
                  fullWidth
                  name="email"
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  autoComplete="email"
                  variant="outlined"
                  required
                  value={formState?.inputs?.email?.value || ""}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    inputHandler(
                      "email",
                      event.target.value,
                      validateEmail(event.target.value)
                    )
                  }
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              

              
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <FormLabel htmlFor="password">Password</FormLabel>
                  {isLogin && (
                    <Link
                      component="button"
                      type="button"
                      onClick={handleForgotPassword}
                      variant="body2"
                      sx={{ alignSelf: "baseline" }}
                    >
                      Forgot your password?
                    </Link>
                  )}
                </Box>

                <TextField
                  fullWidth
                  name="password"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isLogin ? "••••••" : "At least 8 characters"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  value={formState?.inputs?.password?.value || ""}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    inputHandler(
                      "password",
                      event.target.value,
                      isLogin
                        ? event.target.value.length > 0
                        : event.target.value.length >= 8
                    )
                  }
                  InputProps={{
                    sx: { borderRadius: 2 },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword((p) => !p)}
                          edge="end"
                          aria-label="toggle password visibility"
                        >
                          {showPassword ? (
                            <VisibilityOffRoundedIcon fontSize="small" />
                          ) : (
                            <VisibilityRoundedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {!isLogin && passwordValue.length > 0 && (
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={pwMeter.score}
                      color={pwMeter.color}
                      sx={{ borderRadius: 999, height: 6 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Password strength: <b>{pwMeter.label}</b> · use 8+ chars with a
                      number and a symbol.
                    </Typography>
                  </Stack>
                )}
              

              <Button
                variant="contained"
                size="large"
                type="submit"
                disabled={!formState.isValid || submitting}
                endIcon={
                  isLogin ? undefined : <RocketLaunchRoundedIcon />
                }
                sx={{
                  mt: 1,
                  borderRadius: 2,
                  ...brandContainedButtonSx,
                  "&.Mui-disabled": {
                    backgroundColor: "#e5e7eb",
                    color: "#9ca3af",
                  },
                }}
              >
                {submitting
                  ? isLogin
                    ? "Signing in…"
                    : "Creating account…"
                  : isLogin
                  ? "Sign in"
                  : "Create account"}
              </Button>

              {!isLogin && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckRoundedIcon color="success" fontSize="small" />
                  <Typography variant="caption" color="text.secondary">
                    By creating an account you agree to our Terms and conditions.
                  </Typography>
                </Stack>
              )}

              <Typography variant="body2" sx={{ textAlign: "center", mt: 1 }}>
                {isLogin ? `New to ${APP_NAME}?` : "Already have an account?"}{" "}
                <Link
                  component="button"
                  type="button"
                  onClick={handleAuthOptions}
                  sx={{ fontWeight: 700 }}
                >
                  {isLogin ? "Create an account" : "Sign in"}
                </Link>
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LoginForm;
