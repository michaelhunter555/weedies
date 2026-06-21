import type { Metadata } from "next";
import Image from "next/image";

import { Box, Divider, Typography } from "@mui/material";

import {
  LegalSection,
  MarketingPageShell,
} from "@/components/Marketing/MarketingPageShell";
import { APP_NAME } from "@/brand";
import { BRAND_PALETTE } from "@/theme/brand-palette";

export const metadata: Metadata = {
  title: "Our Culture & Values | Dapandflip.com",
  description:
    "The principles behind Dap and Flip. Trust, honesty, respect, and security that guide every app exchange on our marketplace.",
};

export default function CultureAndValuesPage() {
  return (
    <MarketingPageShell
      title="The culture & values of Dap & Flip"
      subtitle="The principles behind every exchange on our marketplace."
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 520,
          mx: "auto",
          mb: 4,
          borderRadius: 1,
          overflow: "hidden",
          border: `1px solid ${BRAND_PALETTE.sage}`,
          bgcolor: BRAND_PALETTE.mint,
        }}
      >
        <Image
          src="/valuesdapandflip.png"
          alt="Dap and Flip values: trust, honesty, respect"
          width={1000}
          height={1000}
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </Box>

      <Typography
        variant="body1"
        color="text.secondary"
        paragraph
        sx={{ lineHeight: 1.7 }}
      >
        {APP_NAME} is built around a simple belief: buying and selling apps should
        feel safe, fair, and human. A marketplace only works when both sides trust
        the process, so trust is something we design for, not assume.
      </Typography>

      <LegalSection
        title="Trust"
        paragraphs={[
          "Every transaction is backed by secure checkout and, for larger deals, escrow protection. Funds and assets move only when both parties are protected.",
          "We give buyers the tools to verify what they’re buying, like ownership checks and connected analytics, so decisions are based on facts.",
        ]}
      />

      <LegalSection
        title="Honesty"
        paragraphs={[
          "Listings should reflect reality. We encourage sellers to share real metrics and disclose known issues. Honest listings build long-term reputations.",
          "We’d rather a slower sale built on truth than a fast one built on hype.",
        ]}
      />

      <LegalSection
        title="Respect"
        paragraphs={[
          "Buyers and sellers are partners in a handover, not opponents. Our exchange room and messaging are designed to keep communication clear and respectful.",
          "Disputes are handled fairly, with both sides given the chance to present evidence before any decision is made.",
        ]}
      />

      <LegalSection
        title="Security"
        paragraphs={[
          "Payments are processed through trusted providers like Stripe and Escrow.com. We never store full card details.",
          "Account access, listings, and transfers are protected so creators can focus on building and flipping, not worrying.",
        ]}
      />

      <LegalSection
        title="Creativity"
        paragraphs={[
          "Indie builders are the heart of this marketplace. We celebrate the people shipping small, bold ideas, and the buyers who give those ideas a second life.",
        ]}
      />

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" color="text.secondary">
        Questions about how we operate? Reach out through our{" "}
        <a href="/contact-us" style={{ color: "inherit", fontWeight: 700 }}>
          contact form
        </a>
        .
      </Typography>
    </MarketingPageShell>
  );
}
