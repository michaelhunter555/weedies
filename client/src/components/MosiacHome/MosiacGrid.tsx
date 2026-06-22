"use client";

import Link from "next/link";

import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContactMailOutlinedIcon from "@mui/icons-material/ContactMailOutlined";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import {
  Box,
  Button,
  Grid2 as Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { APP_NAME } from "@/brand";
import { useLiveChat } from "@/context/live-chat-context";
import { BRAND_PALETTE, brandContainedButtonSx } from "@/theme/brand-palette";

const MOSAIC_ROWS = [
  {
    image: "/teckie.png",
    title: "Get started faster and easier",
    description:
      "List your app in minutes with checkout, payouts, and a marketplace that is ready for buyers.",
    buttonLabel: "Create your account",
    href: "/signup?action=signup",
  },
  {
    image: "/coding_hands.png",
    title: "Earn side income from what you built",
    description:
      "Turn weekend projects and indie apps into cash. Keep most of the revenue when you sell.",
    buttonLabel: "List your app",
    href: "/products?list=new",
  },
  {
    image: "/smile_coder.png",
    title: "Join a diverse platform of founders, devs, and entrepreneurs",
    description:
      "Buyers and sellers who get the hustle. Message sellers, verify listings, and close deals safely.",
    buttonLabel: "Explore the marketplace",
    href: "/products",
  },
  {
    image: "/smile_girl.png",
    title: "Flip apps with confidence",
    description:
      "Find undervalued apps, improve them, and relist when the numbers are stronger.",
    buttonLabel: "Learn how to flip",
    href: "/guides/how-to-flip-your-app",
  },
] as const;

/** Edit comparison copy here as the platform evolves. */
const COMPARISON_ROWS = [
  {
    feature: "Secure checkout",
    dapAndFlip: "Stripe + Escrow.com",
    other: "Varies by marketplace",
  },
  {
    feature: "Ownership verification",
    dapAndFlip: "Built into listings",
    other: "Rarely offered",
  },
  {
    feature: "Listing cost",
    dapAndFlip: "First 3 listings free",
    other: "Often paid upfront",
  },
  {
    feature: "Seller payouts",
    dapAndFlip: "Stripe Connect built in",
    other: "Manual or unclear",
  },
  {
    feature: "Buyer-seller messaging",
    dapAndFlip: "In-platform chat",
    other: "Email or off-site",
  },
  {
    feature: "Dispute handling",
    dapAndFlip: "Platform-supported",
    other: "Mostly DIY",
  },
  {
    feature: "Analytics on listings",
    dapAndFlip: "GA + RevenueCat hooks",
    other: "Seller-provided only",
  },
  {
    feature: "Seller revenue share",
    dapAndFlip: "Keep up to 94%",
    other: "Often lower or unclear",
  },
  {
    feature: "Escrow for large deals",
    dapAndFlip: "Escrow.com at $4k+",
    other: "Rare or manual",
  },
] as const;

/** Trust highlights shown beside the comparison table. */
const TRUST_CARDS = [
  {
    title: "Every listing vetted",
    description:
      "Listings are reviewed before they go live so buyers see real apps, not spam, placeholders, or misleading claims.",
    buttonLabel: "How verification works",
    href: "/guides/how-verification-works",
    icon: VerifiedRoundedIcon,
  },
  {
    title: "Secure exchange flows",
    description:
      "Stripe checkout, Escrow.com for larger deals, and a guided exchange room help both sides transfer assets safely.",
    buttonLabel: "See the handover flow",
    href: "/guides/handover-flow",
    icon: LockRoundedIcon,
  },
] as const;

const HELP_LINKS = [
  {
    label: "FAQs",
    description: "Buying, selling, fees, checkout, and common marketplace questions.",
    href: "/support",
    icon: HelpOutlineRoundedIcon,
  },
  {
    label: "Contact us",
    description: "Reach our team when you need a human answer or account help.",
    href: "/contact-us",
    icon: ContactMailOutlinedIcon,
  },
  {
    label: "Speak with our AI assistant",
    description: "Ask where to go on the site, how features work, and what to do next.",
    icon: AutoAwesomeIcon,
    action: "chat" as const,
  },
] as const;

function RevenueShareCard() {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderColor: BRAND_PALETTE.sage,
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: BRAND_PALETTE.mint,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        sx={{ p: 2 }}
      >
        <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" sx={{ fontWeight: 700, color: BRAND_PALETTE.seafoam }}>
            Seller revenue share
          </Typography>
          <Typography
            variant="h4"
            sx={{ fontWeight: 900, color: BRAND_PALETTE.charcoal, lineHeight: 1 }}
          >
            Up to 94%
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
            Keep more of what you earn when you sell on {APP_NAME}. Built-in Stripe payouts mean less
            chasing invoices and more time building your next app.
          </Typography>
        </Stack>
        <Button
          component={Link}
          href="/products?list=new"
          variant="contained"
          size="small"
          sx={{ ...brandContainedButtonSx, flexShrink: 0 }}
        >
          Start selling
        </Button>
      </Stack>
    </Paper>
  );
}

function HelpLinksCard() {
  const { openChat } = useLiveChat();

  return (
    <Paper
      variant="outlined"
      sx={{
        borderColor: BRAND_PALETTE.sage,
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <Box sx={{ px: 2, py: 1.25, bgcolor: BRAND_PALETTE.mint, borderBottom: `1px solid ${BRAND_PALETTE.sage}` }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: BRAND_PALETTE.charcoal }}>
          Questions? Start here
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Quick links for new buyers and sellers.
        </Typography>
      </Box>
      <Stack divider={<Box sx={{ borderBottom: `1px solid ${BRAND_PALETTE.sage}` }} />}>
        {HELP_LINKS.map((link) => {
          const Icon = link.icon;
          const content = (
            <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ width: "100%" }}>
              <Icon sx={{ fontSize: 20, color: BRAND_PALETTE.seafoam, mt: 0.2, flexShrink: 0 }} />
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: BRAND_PALETTE.charcoal }}>
                  {link.label}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                  {link.description}
                </Typography>
              </Stack>
            </Stack>
          );

          if ("action" in link && link.action === "chat") {
            return (
              <Box
                key={link.label}
                component="button"
                type="button"
                onClick={openChat}
                sx={{
                  display: "block",
                  width: "100%",
                  p: 2,
                  border: 0,
                  bgcolor: "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "rgba(244, 255, 248, 0.9)" },
                }}
              >
                {content}
              </Box>
            );
          }

          return (
            <Box
              key={link.label}
              component={Link}
              href={"href" in link ? link.href : "/support"}
              sx={{
                display: "block",
                p: 2,
                textDecoration: "none",
                color: "inherit",
                "&:hover": { bgcolor: "rgba(244, 255, 248, 0.9)" },
              }}
            >
              {content}
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}

function TrustInfoCard({
  title,
  description,
  buttonLabel,
  href,
  icon: Icon,
}: (typeof TRUST_CARDS)[number]) {
  return (
    <Paper
      variant="outlined"
      sx={{
        height: "100%",
        borderColor: BRAND_PALETTE.sage,
        borderRadius: 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.25,
          bgcolor: BRAND_PALETTE.mint,
          borderBottom: `1px solid ${BRAND_PALETTE.sage}`,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Icon sx={{ fontSize: 18, color: BRAND_PALETTE.seafoam }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: BRAND_PALETTE.charcoal, lineHeight: 1.3, wordBreak: "break-word" }}>
          {title}
        </Typography>
      </Box>
      <Stack spacing={1.5} sx={{ p: 2, flex: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
          {description}
        </Typography>
        <Button
          component={Link}
          href={href}
          variant="outlined"
          size="small"
          sx={{
            alignSelf: "flex-start",
            mt: "auto",
            borderRadius: 1,
            textTransform: "none",
            fontWeight: 700,
            borderColor: BRAND_PALETTE.sage,
            color: BRAND_PALETTE.charcoal,
            "&:hover": { borderColor: BRAND_PALETTE.seafoam, bgcolor: BRAND_PALETTE.mint },
          }}
        >
          {buttonLabel}
        </Button>
      </Stack>
    </Paper>
  );
}

function PlatformComparisonTable() {
  return (
    <Box
      sx={{
        border: `1px solid ${BRAND_PALETTE.sage}`,
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: "#fff",
        width: "100%",
        minWidth: 0,
      }}
    >
      <Box sx={{ px: 2, py: 1.5, bgcolor: BRAND_PALETTE.mint, borderBottom: `1px solid ${BRAND_PALETTE.sage}` }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: BRAND_PALETTE.charcoal }}>
          {APP_NAME} vs other platforms
        </Typography>
        <Typography variant="caption" color="text.secondary">
          A quick snapshot for new sellers and buyers.
        </Typography>
      </Box>

      <Box sx={{ width: "100%", minWidth: 0, overflowX: "auto" }}>
        <Table
          size="small"
          sx={{
            width: "100%",
            tableLayout: "fixed",
            "& td, & th": { wordBreak: "break-word" },
          }}
        >
          <TableHead>
            <TableRow sx={{ bgcolor: "rgba(244, 255, 248, 0.7)" }}>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: BRAND_PALETTE.charcoal, width: "34%" }}>
                Comparison
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: BRAND_PALETTE.charcoal, width: "33%" }}>
                {APP_NAME}
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary", width: "33%" }}>
                Other platforms
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {COMPARISON_ROWS.map((row) => (
              <TableRow
                key={row.feature}
                sx={{
                  "&:last-child td": { borderBottom: 0 },
                  "& td": { borderColor: BRAND_PALETTE.sage, py: 1.1, verticalAlign: "top" },
                }}
              >
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: BRAND_PALETTE.charcoal }}>
                  {row.feature}
                </TableCell>
                <TableCell sx={{ fontSize: 12, color: BRAND_PALETTE.charcoal }}>
                  <Stack direction="row" spacing={0.5} alignItems="flex-start">
                    <CheckRoundedIcon sx={{ fontSize: 14, color: BRAND_PALETTE.seafoam, mt: 0.15, flexShrink: 0 }} />
                    <span>{row.dapAndFlip}</span>
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>
                  <Stack direction="row" spacing={0.5} alignItems="flex-start">
                    <CloseRoundedIcon sx={{ fontSize: 14, color: "rgba(37,52,58,0.35)", mt: 0.15, flexShrink: 0 }} />
                    <span>{row.other}</span>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}

function MosaicPanel() {
  return (
    <Box
      sx={{
        border: `1px solid ${BRAND_PALETTE.sage}`,
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: "#fff",
        width: "100%",
        minWidth: 0,
      }}
    >
      {MOSAIC_ROWS.map((row, index) => {
        const imageFirst = index % 2 === 0;

        return (
          <Grid
            key={row.image}
            container
            spacing={0}
            sx={{
              borderTop: index > 0 ? `1px solid ${BRAND_PALETTE.sage}` : "none",
            }}
          >
            <Grid
              size={{ xs: 12, md: 6 }}
              order={{ xs: 1, md: imageFirst ? 1 : 2 }}
              sx={{
                bgcolor: BRAND_PALETTE.mint,
                borderRight: {
                  md: imageFirst ? `1px solid ${BRAND_PALETTE.sage}` : "none",
                },
                borderLeft: {
                  md: imageFirst ? "none" : `1px solid ${BRAND_PALETTE.sage}`,
                },
              }}
            >
              <Box sx={{ position: "relative", width: "100%", overflow: "hidden" }}>
                <Box
                  component="img"
                  src={row.image}
                  alt=""
                  sx={{
                    width: "100%",
                    maxWidth: "100%",
                    aspectRatio: "1",
                    maxHeight: { md: 220 },
                    display: "block",
                    objectFit: "cover",
                    objectPosition: "center",
                  }}
                />
                <Box
                  aria-hidden
                  sx={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: `
                      linear-gradient(
                        145deg,
                        rgba(244, 255, 248, 0.52) 0%,
                        rgba(196, 224, 211, 0.34) 48%,
                        rgba(143, 182, 170, 0.22) 100%
                      )
                    `,
                    mixBlendMode: "multiply",
                  }}
                />
                <Box
                  aria-hidden
                  sx={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    bgcolor: BRAND_PALETTE.seafoam,
                    opacity: 0.1,
                    mixBlendMode: "soft-light",
                  }}
                />
              </Box>
            </Grid>

            <Grid
              size={{ xs: 12, md: 6 }}
              order={{ xs: 2, md: imageFirst ? 2 : 1 }}
              sx={{
                display: "flex",
                alignItems: "center",
                p: { xs: 2, md: 2.5 },
                borderTop: { xs: `1px solid ${BRAND_PALETTE.sage}`, md: "none" },
              }}
            >
              <Stack spacing={1} sx={{ width: "100%" }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 800, color: BRAND_PALETTE.charcoal, lineHeight: 1.25 }}
                >
                  {row.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                  {row.description}
                </Typography>
                <Button
                  component={Link}
                  href={row.href}
                  variant="contained"
                  size="small"
                  sx={{ ...brandContainedButtonSx, alignSelf: "flex-start", mt: 0.5 }}
                >
                  {row.buttonLabel}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        );
      })}
    </Box>
  );
}

export const HomeMosiacGrid = () => {
  return (
    <Box sx={{ mt: 2, width: "100%", minWidth: 0, overflow: "hidden" }}>
      <Grid container spacing={2} alignItems="flex-start">
        <Grid size={{ xs: 12, lg: 6 }} sx={{ minWidth: 0 }}>
          <MosaicPanel />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }} sx={{ minWidth: 0 }}>
          <Stack spacing={2} sx={{ width: "100%", minWidth: 0 }}>
            <PlatformComparisonTable />
            
            <Grid container spacing={2} sx={{ width: "100%", minWidth: 0 }}>
              {TRUST_CARDS.map((card) => (
                <Grid key={card.title} size={{ xs: 12, sm: 6 }} sx={{ minWidth: 0 }}>
                  <TrustInfoCard {...card} />
                </Grid>
              ))}
            </Grid>
            <HelpLinksCard />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};
