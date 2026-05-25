"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress, Typography } from "@mui/material";

import { useAuth } from "@/context/auth-context";

export default function OnboardingSuccessPage() {
  const { refreshSession, syncUserFromServer } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshSession().catch(() => undefined);
        const next = await syncUserFromServer().catch(() => null);
        if (cancelled) return;
        const id = next?.id;
        if (id) {
          router.replace(`/my-settings/${encodeURIComponent(id)}`);
          return;
        }
        setError("Could not refresh your profile. Open Settings from the menu.");
      } catch {
        if (!cancelled) setError("Something went wrong. Try opening Settings.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, refreshSession, syncUserFromServer]);

  return (
    <Box
      sx={{
        minHeight: "40vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        px: 2,
      }}
    >
      {error ? (
        <Typography color="error" textAlign="center">
          {error}
        </Typography>
      ) : (
        <>
          <CircularProgress />
          <Typography color="text.secondary" variant="body2">
            Updating your account…
          </Typography>
        </>
      )}
    </Box>
  );
}
