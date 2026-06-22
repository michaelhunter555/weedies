import type { Metadata } from "next";
import Image from "next/image";

import { Box, Chip, Divider, Paper, Stack, Typography } from "@mui/material";

import { MarketingPageShell } from "@/components/Marketing/MarketingPageShell";
import { APP_NAME } from "@/brand";
import { BRAND_PALETTE } from "@/theme/brand-palette";

export const metadata: Metadata = {
  title: "Handover Flow | Dapandflip.com",
  description:
    "What happens after you buy an app on Dap and Flip. Message the seller, checkout, review deliverables, and confirm to complete the deal.",
};

const HANDOVER_STEPS = [
  {
    step: 0,
    recommended: true,
    title: "Message the seller first",
    body:
      "Before you buy, open a conversation and ask what is included: source code, store accounts, domains, analytics access, and any known issues. Clear answers upfront make the handover smoother.",
  },
  {
    step: 1,
    recommended: false,
    title: "Complete checkout",
    body:
      "Pay through secure Stripe checkout, or Escrow.com on larger deals. Your payment is protected, the listing is reserved for you, and both sides get access to the exchange room.",
  },
  {
    step: 2,
    recommended: false,
    title: "Seller accepts and begins the handover",
    body:
      "The seller accepts the transaction and starts delivering what was promised: repos, credentials, branding files, documentation, and anything else agreed in the listing or chat.",
  },
  {
    step: 3,
    recommended: false,
    title: "Review everything, then confirm",
    body:
      "Download and review the code, files, and account access in the exchange room. Confirm only when everything checks out. Once you confirm, the transaction is complete and funds are released for payout to the seller.",
  },
] as const;

export default function HandoverFlowPage() {
  return (
    <MarketingPageShell
      title="See the handover flow"
      subtitle="What happens after you buy an app, from first message to final confirmation."
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
          src="/homepage_pack/1.png"
          alt="Buyer completing an app handover on Dap and Flip"
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
        When you buy on {APP_NAME}, you are not left on your own after checkout.
        The exchange room keeps the handover in one place so you can review
        deliverables before anything is finalized.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          The handover, step by step
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          paragraph
          sx={{ mb: 2, lineHeight: 1.7 }}
        >
          Follow this path as a buyer. Step 0 is strongly recommended before you
          commit, but the numbered flow below is what happens once you are ready
          to purchase.
        </Typography>

        <Stack spacing={1.5}>
          {HANDOVER_STEPS.map((item, index) => {
            const isLast = index === HANDOVER_STEPS.length - 1;

            return (
              <Paper
                key={item.step}
                variant="outlined"
                sx={{
                  borderRadius: 1,
                  borderColor: BRAND_PALETTE.sage,
                  bgcolor: "background.paper",
                  p: { xs: 2, sm: 2.5 },
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      flexShrink: 0,
                      bgcolor: item.recommended ? BRAND_PALETTE.seafoam : BRAND_PALETTE.charcoal,
                      color: item.recommended ? BRAND_PALETTE.charcoal : BRAND_PALETTE.onPrimary,
                      border: item.recommended
                        ? `2px solid ${BRAND_PALETTE.charcoal}`
                        : `2px solid ${BRAND_PALETTE.seafoam}`,
                    }}
                  >
                    {item.step}
                  </Box>

                  <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="subtitle1" fontWeight={800}>
                        {item.title}
                      </Typography>
                      {item.recommended ? (
                        <Chip
                          label="Recommended"
                          size="small"
                          sx={{
                            height: 22,
                            fontWeight: 700,
                            fontSize: 11,
                            bgcolor: BRAND_PALETTE.mint,
                            color: BRAND_PALETTE.charcoal,
                            border: `1px solid ${BRAND_PALETTE.sage}`,
                          }}
                        />
                      ) : null}
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.65 }}
                    >
                      {item.body}
                    </Typography>
                  </Stack>
                </Stack>

                {!isLast ? (
                  <Box
                    aria-hidden
                    sx={{
                      position: "absolute",
                      left: 34,
                      bottom: -12,
                      width: 2,
                      height: 12,
                      bgcolor: BRAND_PALETTE.sage,
                      display: { xs: "none", sm: "block" },
                    }}
                  />
                ) : null}
              </Paper>
            );
          })}
        </Stack>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          If something is not right
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Do not confirm until you have what you paid for. If deliverables are missing
          or misrepresented, use the exchange room and resolution center to document
          the issue before funds move. After a successful handover, you can leave an
          optional review to help other buyers.
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" color="text.secondary">
        Still researching? Read{" "}
        <a href="/guides/how-verification-works" style={{ color: "inherit", fontWeight: 700 }}>
          how verification works
        </a>
        , then browse the{" "}
        <a href="/products" style={{ color: "inherit", fontWeight: 700 }}>
          marketplace
        </a>
        .
      </Typography>
    </MarketingPageShell>
  );
}
