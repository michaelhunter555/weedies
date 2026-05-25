import Link from "next/link";

import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import { Stack, Typography } from "@mui/material";

import { ContactForm } from "./contact-form";
import { MarketingPageShell } from "@/components/Marketing/MarketingPageShell";
import { APP_DOMAIN, APP_NAME } from "@/brand";

export default function ContactUsPage() {
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
            first as many answers are there.
          </Typography>
        </Stack>

        <ContactForm />
      </Stack>
    </MarketingPageShell>
  );
}
