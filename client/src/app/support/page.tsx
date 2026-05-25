import Link from "next/link";

import { Typography } from "@mui/material";

import { FaqAccordion, FaqIntroCard } from "@/components/Marketing/FaqAccordion";
import { MarketingPageShell } from "@/components/Marketing/MarketingPageShell";
import { MARKETPLACE_FAQS } from "@/content/marketplace-faqs";
import { APP_NAME } from "@/brand";

export default function FaqsPage() {
  return (
    <MarketingPageShell
      title="FAQs"
      subtitle={`Common questions about buying and selling on ${APP_NAME}.`}
      maxWidth="md"
    >
      <FaqIntroCard>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Can&apos;t find what you need? Check our{" "}
          <Link href="/terms-of-service" style={{ fontWeight: 700 }}>
            Terms & Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" style={{ fontWeight: 700 }}>
            Privacy Policy
          </Link>
          , or{" "}
          <Link href="/contact-us" style={{ fontWeight: 700 }}>
            contact us
          </Link>
          .
        </Typography>
      </FaqIntroCard>

      <FaqAccordion items={MARKETPLACE_FAQS} />
    </MarketingPageShell>
  );
}
