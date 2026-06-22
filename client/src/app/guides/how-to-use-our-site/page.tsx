import type { Metadata } from "next";
import Image from "next/image";

import { Box, Divider, Typography } from "@mui/material";

import {
  LegalSection,
  MarketingPageShell,
} from "@/components/Marketing/MarketingPageShell";
import { HowItWorksStepper } from "@/components/Marketing/HowItWorksStepper";
import { APP_NAME } from "@/brand";
import { BRAND_PALETTE } from "@/theme/brand-palette";

export const metadata: Metadata = {
  title: "How to Use Dap & Flip | Dapandflip.com",
  description:
    "A step-by-step walkthrough of Dap and Flip. From listing your first app to buying one and completing a secure handover.",
};

export default function HowToUseOurSitePage() {
  return (
    <MarketingPageShell
      title="How to use Dap & Flip"
      subtitle="From your first listing to a secure handover. Here's the full walkthrough."
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
          src="/yourapps.png"
          alt="Turn your apps into your next big idea on Dap and Flip"
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
        {APP_NAME} is a marketplace where indie builders list apps for sale and
        buyers discover, purchase, and take over projects. Here's how to get the
        most out of it, whether you're selling or buying.
      </Typography>

      <HowItWorksStepper sx={{ my: 4 }} />

      <LegalSection
        title="1. Create your account"
        paragraphs={[
          "Sign up with email or a supported provider. Verify your email so you can list, message, and check out without interruptions.",
          "Sellers connect Stripe to receive payouts. Buyers can browse and purchase right away.",
        ]}
      />

      <LegalSection
        title="2. List an app to sell"
        paragraphs={[
          "Open “List your app” and fill in the details: name, description, category, platforms, price, and screenshots.",
          "Your first listings are free. After that, a small flat listing fee applies per listing.",
          "Optionally connect analytics (Google Analytics, RevenueCat) and verify ownership to build buyer confidence.",
        ]}
      />

      <LegalSection
        title="3. Discover apps to buy"
        paragraphs={[
          "Use search and category filters to find apps that fit your goals. Each listing shows price, platforms, and any verified metrics.",
          "Message the seller with questions before you commit. Clear communication leads to smoother handovers.",
        ]}
      />

      <LegalSection
        title="4. Check out securely"
        paragraphs={[
          "Most purchases use secure Stripe checkout. Purchases of $4,000 or more use Escrow.com for added protection.",
          "Your payment is protected, and the listing is reserved for you once payment is confirmed.",
        ]}
      />

      <LegalSection
        title="5. Complete the handover"
        paragraphs={[
          "After purchase, the exchange room walks both parties through transferring code, accounts, store listings, and branding.",
          "Confirm receipt once everything is delivered. For escrow deals, funds release after the inspection period.",
        ]}
      />

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" color="text.secondary">
        Still have questions? Visit{" "}
        <a href="/support" style={{ color: "inherit", fontWeight: 700 }}>
          support
        </a>
        , read{" "}
        <a href="/guides/how-verification-works" style={{ color: "inherit", fontWeight: 700 }}>
          how verification works
        </a>
        {" "}or{" "}
        <a href="/guides/handover-flow" style={{ color: "inherit", fontWeight: 700 }}>
          the handover flow
        </a>
        , or{" "}
        <a href="/contact-us" style={{ color: "inherit", fontWeight: 700 }}>
          contact us
        </a>
        .
      </Typography>
    </MarketingPageShell>
  );
}
