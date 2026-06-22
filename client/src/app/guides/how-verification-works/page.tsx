import type { Metadata } from "next";
import Image from "next/image";

import { Box, Divider, Paper, Stack, Typography } from "@mui/material";

import {
  LegalSection,
  MarketingPageShell,
} from "@/components/Marketing/MarketingPageShell";
import { APP_NAME } from "@/brand";
import { BRAND_PALETTE } from "@/theme/brand-palette";
import {
  OWNERSHIP_VERIFICATION_WELL_KNOWN_PATH,
  STORE_LISTING_CODE_PREFIX,
} from "@/lib/ownership-verification";

export const metadata: Metadata = {
  title: "How Verification Works | Dapandflip.com",
  description:
    "What Dap and Flip checks before you browse or buy: listing review, ownership verification, and connected metrics on the marketplace.",
};

const LISTING_CHECKLIST = [
  "The app is live and available to real users.",
  "Content is appropriate for public viewing; sensitive apps are listed privately, not shown openly in browser.",
  "The app does not promote racism or discrimination of any kind.",
  "The app is complete, not a placeholder or unfinished concept.",
  "Verify linked channels (YouTube, Facebook, TikTok, and similar) exist if included in the listing claims.",
] as const;

const SELLER_ENCOURAGEMENT_CHECKLIST = [
  "Connect Google Analytic",
  "Connect RevenueCat",
  "Verify Ownership",
] as const;

export default function HowVerificationWorksPage() {
  return (
    <MarketingPageShell
      title="How verification works"
      subtitle="What we check before you browse, buy, or take over an app."
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
          src="/homepage_pack/3.png"
          alt="Secure app verification on Dap and Flip"
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
        Verification on {APP_NAME} is built so you can browse with more confidence.
        We review listings, check ownership where possible, and surface connected analytics
        when sellers share them, so you are not buying blind from a screenshot.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          What we look for on every listing
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          paragraph
          sx={{ mb: 2, lineHeight: 1.7 }}
        >
          We make sure every listing on the marketplace follows the standards below.
          When you shop on {APP_NAME}, this is the baseline you can expect.
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 1,
            borderColor: BRAND_PALETTE.sage,
            bgcolor: "background.paper",
            p: { xs: 2, sm: 2.5 },
          }}
        >
          <Stack component="ul" spacing={1.5} sx={{ m: 0, p: 0, listStyle: "none" }}>
            {LISTING_CHECKLIST.map((item) => (
              <Box
                key={item}
                component="li"
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.5,
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 18,
                    height: 18,
                    mt: 0.25,
                    flexShrink: 0,
                    borderRadius: "50%",
                    border: `2px solid ${BRAND_PALETTE.seafoam}`,
                    bgcolor: "transparent",
                  }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.65, fontWeight: 500 }}
                >
                  {item}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Box>

      <Box sx={{ mb: 3 }}>
      <Typography variant="h6" fontWeight={800} gutterBottom>
          What we encourage sellers to do to increase buyer confidence in their listing
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          paragraph
          sx={{ mb: 2, lineHeight: 1.7 }}
        >
         We encourage but don't require sellers to connect 3rd party tools like Google Analytics or RevenueCat to show live metrics on the product page.
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 1,
            borderColor: BRAND_PALETTE.sage,
            bgcolor: "background.paper",
            p: { xs: 2, sm: 2.5 },
          }}
        >
          <Stack component="ul" spacing={1.5} sx={{ m: 0, p: 0, listStyle: "none" }}>
            {SELLER_ENCOURAGEMENT_CHECKLIST.map((item) => (
              <Box
                key={item}
                component="li"
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.5,
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 18,
                    height: 18,
                    mt: 0.25,
                    flexShrink: 0,
                    borderRadius: "50%",
                    border: `2px solid ${BRAND_PALETTE.seafoam}`,
                    bgcolor: "transparent",
                  }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.65, fontWeight: 500 }}
                >
                  {item}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Box>

      <LegalSection
        title="1. Review before you see it in search"
        paragraphs={[
          "New listings are reviewed before they appear in the marketplace. We look for clear details, realistic pricing, and signs that the app is real.",
          "That keeps spam, placeholders, and misleading claims out of your search results.",
        ]}
      />

      <LegalSection
        title="2. Ownership verification"
        paragraphs={[
          "When a listing shows a verified badge, the seller proved they control the app. That usually means a verification file on the app website, or a short code on the App Store or Google Play listing.",
          `Website checks use a file at ${OWNERSHIP_VERIFICATION_WELL_KNOWN_PATH}. Store listings use a code starting with ${STORE_LISTING_CODE_PREFIX}.`,
          "If you do not see the badge, treat ownership as unconfirmed and ask the seller directly before you buy.",
        ]}
      />

      <LegalSection
        title="3. Connected metrics (when available)"
        paragraphs={[
          "Some listings connect Google Analytics or RevenueCat and show live metrics on the product page.",
          "When you see connected data, you get a clearer picture of traffic, subscribers, or revenue without relying on seller-provided screenshots alone.",
        ]}
      />

      <LegalSection
        title="4. What you should still check"
        paragraphs={[
          "Verification lowers risk, but your due diligence still matters. Message the seller, read store ratings, and ask about infrastructure, contracts, and known issues before checkout.",
          "For larger deals, escrow protection and the exchange room give you a structured path to review deliverables before funds release.",
        ]}
      />

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" color="text.secondary">
        Ready to browse? Explore the{" "}
        <a href="/products" style={{ color: "inherit", fontWeight: 700 }}>
          marketplace
        </a>
        , or read about{" "}
        <a href="/guides/handover-flow" style={{ color: "inherit", fontWeight: 700 }}>
          the handover flow
        </a>{" "}
        after you buy.
      </Typography>
    </MarketingPageShell>
  );
}
