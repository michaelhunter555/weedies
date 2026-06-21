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
  title: "How to Flip Your App in 2026 to 2027 | Dapandflip.com",
  description:
    "A practical playbook for buying, improving, and reselling indie apps on Dap and Flip in 2026 and 2027.",
};

export default function HowToFlipYourAppPage() {
  return (
    <MarketingPageShell
      title="How to flip your app in 2026 to 2027"
      subtitle="A practical playbook for finding, improving, and reselling indie apps this cycle."
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
          src="/flipapp.png"
          alt="Flipping an app on Dap and Flip"
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
        “Flipping” an app means acquiring a digital product, increasing its value,
        and reselling it for a profit. In 2026 to 2027 the bar to ship software has
        never been lower, which means there are more small, promising apps changing
        hands than ever. {APP_NAME} exists to make those handovers safe and simple.
      </Typography>

      <LegalSection
        title="1. Find the right app to flip"
        paragraphs={[
          "Look for apps with a clear niche, real (even if small) usage, and an owner who has run out of time or interest. These are the easiest to improve.",
          "Check the fundamentals: active users, monthly revenue, app store ratings, and how much work is needed to keep it running.",
          "Browse live listings on the marketplace and filter by category, price, and platform to spot undervalued apps.",
        ]}
      />

      <LegalSection
        title="2. Evaluate before you buy"
        paragraphs={[
          "Verify ownership and analytics where available. Listings can connect Google Analytics and RevenueCat so you can see real numbers, not just claims.",
          "Estimate the cost to improve: design refresh, new features, ASO (app store optimization), or migrating infrastructure.",
          "Decide your exit up front. Are you reselling quickly after a quick polish, or holding to grow revenue first?",
        ]}
      />

      <LegalSection
        title="3. Buy securely"
        paragraphs={[
          "Smaller purchases run through secure Stripe checkout. Higher-value acquisitions can use Escrow.com so funds are protected until handover is complete.",
          "After payment, the exchange room guides both parties through transferring code, accounts, store listings, and branding assets.",
        ]}
      />

      <LegalSection
        title="4. Improve and increase value"
        paragraphs={[
          "Ship the highest-impact improvements first: fix crashes, modernize the UI, and close obvious gaps users complain about in reviews.",
          "Grow the numbers that buyers care about, like retention, monthly revenue, and ratings. Document the changes so you can prove the lift later.",
        ]}
      />

      <LegalSection
        title="5. Relist and flip"
        paragraphs={[
          "When the app is in a stronger position, list it again. Your first listings are free, so you can test pricing without upfront cost.",
          "Be transparent: share updated metrics and what you changed. Honest listings sell faster and build your reputation as a trusted flipper.",
        ]}
      />

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" color="text.secondary">
        Ready to start? Browse apps on the{" "}
        <a href="/products" style={{ color: "inherit", fontWeight: 700 }}>
          marketplace
        </a>{" "}
        or{" "}
        <a href="/products?list=new" style={{ color: "inherit", fontWeight: 700 }}>
          list your own app
        </a>
        .
      </Typography>
    </MarketingPageShell>
  );
}
