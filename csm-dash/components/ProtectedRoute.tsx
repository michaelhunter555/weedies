"use client";
import { useEffect } from 'react';
import useAuth from "@/context/auth-context";
import { Box, CircularProgress } from "@mui/material";
import { useRouter } from "next/router";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { isLoggedIn, hydrated, jwtToken } = useAuth();

  useEffect(() => {
    if (hydrated && !isLoggedIn) {
      router.replace('/login');
    }
  }, [hydrated, isLoggedIn, router])

  if (!hydrated) {
    // Show a spinner or even your app layout’s shell
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }
  if (!jwtToken) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
