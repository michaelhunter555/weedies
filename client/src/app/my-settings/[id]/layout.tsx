"use client";

import { useParams } from "next/navigation";

import { Box, Stack } from "@mui/material";

import { MySettingsSidebar } from "@/components/MySettings/MySettingsSidebar";
import { BRAND_PALETTE } from "@/theme/brand-palette";
import { useAuth } from "@/context/auth-context";

export default function MySettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const { user, hydrated } = useAuth();
  const routeUserId = params?.id ? String(params.id).trim() : "";
  const sessionUserId = user?.id ? String(user.id).trim() : "";

  const showSidebar =
    hydrated &&
    Boolean(user) &&
    Boolean(routeUserId) &&
    Boolean(sessionUserId) &&
    routeUserId === sessionUserId;

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <Box
      sx={{
        maxWidth: 1320,
        mx: "auto",
        px: { xs: 2, sm: 3 },
        py: { xs: 2, md: 3 },
        bgcolor: BRAND_PALETTE.mint,
        minHeight: "calc(100vh - 120px)",
        borderRadius: { md: 4 },
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="flex-start">
        <MySettingsSidebar userId={sessionUserId} mode={user?.mode} />
        <Box component="main" sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          {children}
        </Box>
      </Stack>
    </Box>
  );
}
