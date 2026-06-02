"use client";

import { useState } from "react";
import Link from "next/link";

import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";

import { ContactForm } from "./contact-form";
import { MarketingPageShell } from "@/components/Marketing/MarketingPageShell";
import { useAuth } from "@/context/auth-context";
import { APP_DOMAIN, APP_NAME, SUPPORT_EMAIL } from "@/brand";
import { brandContainedButtonSx } from "@/theme/brand-palette";

const signInHref = `/signup?returnUrl=${encodeURIComponent("/contact-us")}`;

export default function ContactUsPage() {
  const { user, hydrated, isLoggedIn } = useAuth();
  const [messageSent, setMessageSent] = useState(false);

  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "";
  const accountEmail = user?.email?.trim() ?? "";

  return (
    <MarketingPageShell
      title="Contact us"
      subtitle={`Questions about ${APP_NAME} (${APP_DOMAIN})? We're here to help.`}
      maxWidth="sm"
    >
      <Stack spacing={3}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <MailOutlineRoundedIcon color="action" sx={{ mt: 0.25 }} />
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            For order or payout issues, include your account email and listing ID.
            Check the{" "}
            <Link href="/support" style={{ fontWeight: 700 }}>
              FAQs
            </Link>{" "}
            first — many answers are there.
          </Typography>
        </Stack>

        {!hydrated ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : !isLoggedIn ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Sign in to send us a message through this form. You can also email us directly at{" "}
              <Link href={`mailto:${SUPPORT_EMAIL}`} style={{ fontWeight: 700 }}>
                {SUPPORT_EMAIL}
              </Link>
              .
            </Typography>
            <Button
              component={Link}
              href={signInHref}
              variant="contained"
              size="small"
              sx={{ ...brandContainedButtonSx, textTransform: "none", fontWeight: 700 }}
            >
              Sign in to contact support
            </Button>
          </Alert>
        ) : messageSent ? (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Your message has been sent. We will get back to you at{" "}
            <b>{accountEmail}</b> as soon as we can.
          </Alert>
        ) : (
          <ContactForm
            key={accountEmail}
            defaultName={displayName}
            defaultEmail={accountEmail}
            onSubmitted={() => setMessageSent(true)}
          />
        )}
      </Stack>
    </MarketingPageShell>
  );
}
