"use client";

import { useContext, useEffect, useState } from "react";
import Image from "next/image";
import { AuthContext } from "@/context/auth-context";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AddBoxRoundedIcon from "@mui/icons-material/AddBoxRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import {
  Badge,
  Box,
  Button,
  Container,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Stack from "@mui/material/Stack";

import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { APP_TAGLINE } from "@/brand";

import Header from "./Header";
import {
  BRAND_PALETTE,
  brandContainedButtonSx,
  brandLogoMarkSx,
} from "@/theme/brand-palette";
import { useRouter } from "next/navigation";

const MainNavigation = () => {
  const router = useRouter();
  const auth = useContext(AuthContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const [mounted, setMounted] = useState(false);
  const { unreadCount } = useUnreadMessages();

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveIsMobile = mounted ? isMobile : false;
  const effectiveIsTablet = mounted ? isTablet : false;

  return (
    <Box
      sx={{
        borderBottom: `1px solid ${BRAND_PALETTE.borderSubtle}`,
        backgroundColor: "#ffffff",
        position: "sticky",
        top: 0,
        zIndex: 1100,
        backdropFilter: "saturate(180%) blur(8px)",
      }}
    >
      <Container maxWidth="lg" sx={{ py: 1, overflow: "hidden" }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ minWidth: 0 }}
        >
          <Stack sx={{ minWidth: 0, flexShrink: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              onClick={() => router.push("/")}
              sx={{ cursor: "pointer", borderRadius: 20, minWidth: 0 }}
            >
              <Box
                sx={{
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Image
                  src="/fist_bump.svg"
                  alt="Dap & Flip"
                  width={effectiveIsMobile ? 44 : 75}
                  height={effectiveIsMobile ? 44 : 75}
                />
              </Box>
              <Stack direction="column" spacing={0} sx={{ lineHeight: 1, minWidth: 0 }}>
                <Typography
                  variant="h6"
                  noWrap
                  sx={{ fontWeight: 800, lineHeight: 1, color: BRAND_PALETTE.charcoal }}
                >
                  <Box
                    component="span"
                    sx={{ fontSize: { xs: 15, sm: 18 }, letterSpacing: "-0.5px" }}
                  >
                    Dap & Flip.
                  </Box>
                </Typography>
              </Stack>
            </Stack>
            {!effectiveIsTablet && !effectiveIsMobile ? (
              <Typography variant="subtitle2" color="text.secondary">
                {APP_TAGLINE}
              </Typography>
            ) : null}
          </Stack>

          <Stack
            sx={{
              flex: { xs: 0, sm: 1 },
              display: "flex",
              justifyContent: "center",
              minWidth: 0,
            }}
          >
            <Header />
          </Stack>

          {/* Right-side actions */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ flexShrink: 0 }}
          >
            {effectiveIsMobile && mounted ? (
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  if (auth.isLoggedIn && auth.user?.id) {
                    router.push(`/my-settings/${encodeURIComponent(String(auth.user.id))}`);
                  } else {
                    router.push("/signup");
                  }
                }}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  minWidth: 0,
                  px: 0.75,
                  color: BRAND_PALETTE.charcoal,
                }}
              >
                {auth.isLoggedIn ? "Account" : "Sign in"}
              </Button>
            ) : null}
            {!effectiveIsMobile && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddBoxRoundedIcon />}
                onClick={() => router.push("/products?list=new")}
                sx={{ ...brandContainedButtonSx, px: 2 }}
              >
                List your app
              </Button>
            )}

            {mounted && auth.isLoggedIn ? (
              <Tooltip title="Messages">
                <IconButton
                  size="small"
                  onClick={() => router.push("/messages")}
                  aria-label={
                    unreadCount > 0
                      ? `Open inbox (${unreadCount} unread)`
                      : "Open inbox"
                  }
                  sx={{ color: BRAND_PALETTE.charcoal }}
                >
                  <Badge
                    color="error"
                    max={99}
                    badgeContent={unreadCount}
                    invisible={unreadCount === 0}
                    overlap="circular"
                  >
                    <MailRoundedIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>
            ) : null}

            {!effectiveIsMobile && mounted && (
              <Button
                variant="text"
                onClick={() => {
                  if (auth.isLoggedIn && auth.user?.id) {
                    router.push(`/my-settings/${auth.user.id}`);
                  } else {
                    router.push("/signup");
                  }
                }}
                sx={{ textTransform: "none" }}
              >
                {auth.isLoggedIn ? "Account" : "Sign in"}
              </Button>
            )}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default MainNavigation;
