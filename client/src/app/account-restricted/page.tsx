"use client";

import Link from "next/link";
import { useContext } from "react";

import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import PauseCircleOutlineRoundedIcon from "@mui/icons-material/PauseCircleOutlineRounded";
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { AuthContext } from "@/context/auth-context";
import { brandContainedButtonSx } from "@/theme/brand-palette";
import type { AccountStanding } from "../../../types";

function copyForStanding(standing: AccountStanding | undefined) {
  if (standing === "banned") {
    return {
      title: "Account banned",
      body: "Your account can no longer use Dap & Flip. If you believe this is a mistake, contact support.",
      icon: <BlockRoundedIcon sx={{ fontSize: 48, color: "error.main" }} />,
    };
  }
  return {
    title: "Account suspended",
    body: "Your account is temporarily suspended. You cannot list, buy, or message until the restriction is lifted.",
    icon: (
      <PauseCircleOutlineRoundedIcon
        sx={{ fontSize: 48, color: "warning.main" }}
      />
    ),
  };
}

export default function AccountRestrictedPage() {
  const auth = useContext(AuthContext);
  const standing = auth.user?.accountStanding ?? "good";
  const { title, body, icon } = copyForStanding(standing);

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 5 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          textAlign: "center",
        }}
      >
        <Stack spacing={2} alignItems="center">
          {icon}
          <Typography variant="h4" fontWeight={800}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {body}
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ pt: 2, width: "100%", justifyContent: "center" }}
          >
            <Button
              component={Link}
              href="/contact-us"
              variant="outlined"
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 999 }}
            >
              Contact support
            </Button>
            {auth.isLoggedIn && (
              <Button
                variant="contained"
                onClick={() => void auth.logout()}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 999,
                  ...brandContainedButtonSx,
                }}
              >
                Sign out
              </Button>
            )}
          </Stack>
          {!auth.isLoggedIn && (
            <Box sx={{ pt: 1 }}>
              <Button component={Link} href="/" sx={{ textTransform: "none" }}>
                Back to home
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
