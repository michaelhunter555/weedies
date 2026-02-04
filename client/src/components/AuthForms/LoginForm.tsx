"use client";
import {
  useContext,
  useEffect,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

import StyledText from '@/components/Shared/Text/StyledText';
import { AuthContext } from '@/context/auth-context';
import { useForm } from '@/hooks/useForm';
import { auth as firebaseAuth } from "@/lib/firebase";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MuiCard from '@mui/material/Card';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import Link from '@mui/material/Link';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';

import { type UserProps } from '../../../types';
import { loginFields } from './formFields';

const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "100%",
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  boxShadow:
    "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
  [theme.breakpoints.up("sm")]: {
    width: "450px",
  },
  ...theme.applyStyles("dark", {
    boxShadow:
      "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
  }),
}));

const validateEmail = (email: string) => {
  return /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/.test(email);
};

const LoginForm = () => {
  const auth = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [formState, inputHandler, setFormData] = useForm(loginFields, false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  //set form when valid
  useEffect(() => {
    if (formState.isValid) {
      setFormData(
        {
          ...(!isLogin && {
            userName: {
              value: formState?.inputs?.userName?.value,
              isValid: true,
            },
          }),
          email: {
            value: formState?.inputs?.email?.value,
            isValid: true,
          },
          password: {
            value: formState?.inputs?.password?.value,
            isValid: true,
          },
        },
        true
      );
    }
  }, [
    isLogin,
    formState.isValid,
    setFormData,
    formState?.inputs?.userName?.value,
    formState?.inputs?.email?.value,
    formState?.inputs?.password?.value,
  ]);

  useEffect(() => {
    if (auth.isLoggedIn) {
      router.push("/");
    }
  }, [auth.isLoggedIn, router]);

  //login or signup user
  const handleFormSubmit = async (event: React.FormEvent<HTMLElement>) => {
    event.preventDefault();
    setError(null);
    const user: UserProps = {
      //add additional field if sign-up
      ...(formState?.inputs?.userName?.value
        ? { userName: formState?.inputs?.userName?.value as string }
        : {}),
      email: formState?.inputs?.email?.value as string,
      password: formState?.inputs?.password?.value as string,
    };

    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(firebaseAuth, user.email, user.password);
        const idToken = await cred.user.getIdToken();
        await auth.loginWithProviderToken("firebase", idToken);
      } else {
        const cred = await createUserWithEmailAndPassword(firebaseAuth, user.email, user.password);
        const idToken = await cred.user.getIdToken();
        await auth.loginWithProviderToken("firebase", idToken);
        setFormData(loginFields, false);
      }

      router.push("/");
    } catch (e: any) {
      setError(e?.message || "Authentication failed");
    }
  };

  //toggle between sign-up and login
  const handleAuthOptions = () => {
    setIsLogin((prev) => !prev);
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
      setError("Password reset email sent. Check your inbox.");
    } catch (e: any) {
      setError(e?.message || "Could not send reset email");
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();
      await auth.loginWithProviderToken("firebase", idToken);
      router.push("/");
    } catch (e: any) {
      setError(e?.message || "Google sign-in failed");
    }
  };

  return (
    <Card variant="outlined">
      <StyledText
        sx={{ width: "100%", fontSize: "clamp(2rem, 10vw, 2.15rem)" }}
        variant="h4"
      >
        {isLogin ? "Sign in" : "Sign up"}
      </StyledText>
      <Box
        component="form"
        onSubmit={handleFormSubmit}
        noValidate
        sx={{ display: "flex", flexDirection: "column", width: "100%", gap: 2 }}
      >
        {error && (
          <StyledText variant="subtitle2" sx={{ color: "error.main" }}>
            {error}
          </StyledText>
        )}
        {/* for new user include userName field */}
        {!isLogin && (
          <FormControl>
            <FormLabel htmlFor="userName">Username</FormLabel>
            <TextField
              fullWidth
              name="userName"
              id="userName"
              type="text"
              placeholder="username"
              autoComplete="username"
              variant="outlined"
              value={formState?.inputs?.userName?.value}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                inputHandler(
                  "userName",
                  event.target.value,
                  event.target.value.length > 0
                )
              }
            />
          </FormControl>
        )}

        <FormControl>
          <FormLabel htmlFor="password">Email</FormLabel>

          <TextField
            fullWidth
            name="email"
            id="email"
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
            variant="outlined"
            required
            value={formState?.inputs?.email?.value}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              inputHandler(
                "email",
                event.target.value,
                validateEmail(event.target.value)
              )
            }
          />
        </FormControl>
        <FormControl>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <FormLabel htmlFor="password">Password</FormLabel>
            <Link
              component="button"
              onClick={handleForgotPassword}
              variant="body2"
              sx={{ alignSelf: "baseline" }}
            >
              Forgot your password?
            </Link>
          </Box>

          <TextField
            fullWidth
            name="password"
            id="password"
            type="password"
            placeholder="••••••"
            required
            value={formState?.inputs?.password?.value}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              inputHandler(
                "password",
                event.target.value,
                event.target.value.length > 0
              )
            }
          />
        </FormControl>

        <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <Button
            sx={{ marginTop: "1rem" }}
            variant="contained"
            type="submit"
            disabled={!formState.isValid}
          >
            {isLogin ? "Login" : "Sign Up"}
          </Button>
          <Button
            sx={{ marginTop: "0.5rem" }}
            variant="outlined"
            type="button"
            onClick={handleGoogle}
          >
            Continue with Google
          </Button>
          <StyledText variant="subtitle1" sx={{ textAlign: "center" }}>
            Don&apos;t have an account?{" "}
            <span onClick={handleAuthOptions} style={{ cursor: "pointer" }}>
              <Link variant="body2" sx={{ alignSelf: "center" }}>
                {isLogin ? "Sign-up" : "Login"}
              </Link>
            </span>
          </StyledText>
        </Box>
      </Box>
    </Card>
  );
};

export default LoginForm;
