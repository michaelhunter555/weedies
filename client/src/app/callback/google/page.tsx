"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRedirectResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useContext } from "react";
import { AuthContext } from "@/context/auth-context";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Finishing Google sign-in...");
  const authCtx = useContext(AuthContext);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await getRedirectResult(auth);

        if (!result?.user) {
          if (!cancelled) setMessage("No Google redirect result found. You can close this page.");
          return;
        }

        const idToken = await result.user.getIdToken();
        await authCtx.loginWithProviderToken("google", idToken);

        if (!cancelled) setMessage("Signed in. Redirecting...");
        router.replace("/");
      } catch (err) {
        if (!cancelled) setMessage("Google sign-in failed. Please try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div style={{ padding: 24 }}>
      <h1>Google Callback</h1>
      <p>{message}</p>
    </div>
  );
}


