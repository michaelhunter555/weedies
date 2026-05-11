"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";

import type { AnalyticsProvider } from "../../../../types";

type Kind = "sales" | "analytics";

type ProviderCard = {
  id: AnalyticsProvider;
  name: string;
  kind: Kind;
  description: string;
  accent: string;
  initials: string;
};

const PROVIDERS: ProviderCard[] = [
  {
    id: "revenuecat",
    name: "RevenueCat",
    kind: "sales",
    description:
      "Connect your RevenueCat project to verify subscription MRR, churn and active subscribers.",
    accent: "#f59e0b",
    initials: "RC",
  },
  {
    id: "stripe",
    name: "Stripe",
    kind: "sales",
    description:
      "Authorize read-only access to pull verified lifetime revenue and monthly payouts.",
    accent: "#635bff",
    initials: "S",
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    kind: "analytics",
    description:
      "Connect GA4 to verify monthly active users, sessions and conversion rates.",
    accent: "#f9ab00",
    initials: "GA",
  },
  {
    id: "mixpanel",
    name: "Mixpanel",
    kind: "analytics",
    description:
      "Import event-level usage, retention curves and funnel performance.",
    accent: "#7856ff",
    initials: "MP",
  },
  {
    id: "plausible",
    name: "Plausible",
    kind: "analytics",
    description:
      "Pull simple, privacy-first pageviews and unique visitors.",
    accent: "#5850ec",
    initials: "PL",
  },
];

type PendingListing = {
  appName?: string;
  tagline?: string;
  hasSalesToVerify?: boolean;
  hasAnalyticsToVerify?: boolean;
};

export default function VerifyListingPage() {
  const router = useRouter();
  const [connected, setConnected] = useState<Record<AnalyticsProvider, boolean>>(
    {
      revenuecat: false,
      stripe: false,
      "google-analytics": false,
      mixpanel: false,
      plausible: false,
    }
  );
  const [connecting, setConnecting] = useState<AnalyticsProvider | null>(null);
  const [pending, setPending] = useState<PendingListing | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("vibestack.pendingListing");
      if (raw) setPending(JSON.parse(raw) as PendingListing);
    } catch {
      // ignore
    }
  }, []);

  const salesConnected = useMemo(
    () =>
      PROVIDERS.filter((p) => p.kind === "sales").some((p) => connected[p.id]),
    [connected]
  );
  const analyticsConnected = useMemo(
    () =>
      PROVIDERS.filter((p) => p.kind === "analytics").some(
        (p) => connected[p.id]
      ),
    [connected]
  );
  const anyConnected = salesConnected || analyticsConnected;

  const handleConnect = async (id: AnalyticsProvider) => {
    setConnecting(id);
    // Simulated OAuth handshake — swap this out for a real redirect to the
    // provider's OAuth URL (e.g. Stripe Connect / Google OAuth consent).
    await new Promise((r) => setTimeout(r, 700));
    setConnected((prev) => ({ ...prev, [id]: true }));
    setConnecting(null);
  };

  const handleDisconnect = (id: AnalyticsProvider) => {
    setConnected((prev) => ({ ...prev, [id]: false }));
  };

  const handleFinish = () => {
    try {
      sessionStorage.setItem(
        "vibestack.pendingListing",
        JSON.stringify({
          ...(pending || {}),
          verifiedProviders: (Object.keys(connected) as AnalyticsProvider[])
            .filter((k) => connected[k]),
          isListingVerified: salesConnected,
          isAnalyticsVerified: analyticsConnected,
        })
      );
    } catch {
      // ignore
    }
    router.push("/products?listed=1");
  };

  const handleSkip = () => router.push("/products?listed=1");

  const showSalesSection = pending?.hasSalesToVerify !== false;
  const showAnalyticsSection = pending?.hasAnalyticsToVerify !== false;

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            color: "#fff",
            overflow: "hidden",
            position: "relative",
            background:
              "radial-gradient(900px 400px at 10% 0%, rgba(236,72,153,0.35), transparent 60%)," +
              "radial-gradient(800px 400px at 100% 100%, rgba(245,158,11,0.35), transparent 60%)," +
              "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #4c1d95 100%)",
          }}
        >
          <Stack spacing={2}>
            <Chip
              icon={
                <VerifiedRoundedIcon
                  sx={{ fontSize: 16, color: "#fde68a !important" }}
                />
              }
              label="Optional · Step 2 of 2"
              size="small"
              sx={{
                width: "fit-content",
                backgroundColor: "rgba(255,255,255,0.12)",
                color: "#fde68a",
                border: "1px solid rgba(255,255,255,0.18)",
                fontWeight: 600,
              }}
            />

            <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
              Verify {pending?.appName ? <b>{pending.appName}</b> : "your listing"}
              &rsquo;s sales &amp; analytics.
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.85)", maxWidth: 640 }}>
              Listings with verified metrics sell roughly <b>2.4× faster</b> and
              for a higher multiple. Connect any of the sources below — read-only,
              and you can disconnect anytime. This step is 100% optional.
            </Typography>

            {/* Badge preview */}
            <Paper
              elevation={0}
              sx={{
                mt: 1,
                p: 2,
                borderRadius: 3,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                width: "fit-content",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background:
                      "linear-gradient(135deg, #fda4af 0%, #fcd34d 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#111827",
                  }}
                >
                  <ShieldRoundedIcon />
                </Box>
                <Stack>
                  <Typography sx={{ fontWeight: 800 }}>
                    Verified Sales &amp; Analytics
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)" }}>
                    {anyConnected
                      ? "Badge unlocked — buyers will see this on your listing."
                      : "Connect at least one source to unlock the badge."}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Paper>

        {/* Sales providers */}
        {showSalesSection && (
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <TrendingUpRoundedIcon color="secondary" />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Sales data
              </Typography>
              {salesConnected && (
                <Chip
                  size="small"
                  color="success"
                  icon={<CheckCircleRoundedIcon sx={{ fontSize: 14 }} />}
                  label="Connected"
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Connect one source so buyers can see verified revenue, MRR or
              payouts.
            </Typography>
            <Stack spacing={1}>
              {PROVIDERS.filter((p) => p.kind === "sales").map((p) => (
                <ProviderRow
                  key={p.id}
                  provider={p}
                  connected={connected[p.id]}
                  busy={connecting === p.id}
                  onConnect={() => handleConnect(p.id)}
                  onDisconnect={() => handleDisconnect(p.id)}
                />
              ))}
            </Stack>
          </Stack>
        )}

        {/* Analytics providers */}
        {showAnalyticsSection && (
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <InsightsRoundedIcon color="secondary" />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Analytics data
              </Typography>
              {analyticsConnected && (
                <Chip
                  size="small"
                  color="success"
                  icon={<CheckCircleRoundedIcon sx={{ fontSize: 14 }} />}
                  label="Connected"
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Show verified usage — MAUs, sessions, retention or conversion.
            </Typography>
            <Stack spacing={1}>
              {PROVIDERS.filter((p) => p.kind === "analytics").map((p) => (
                <ProviderRow
                  key={p.id}
                  provider={p}
                  connected={connected[p.id]}
                  busy={connecting === p.id}
                  onConnect={() => handleConnect(p.id)}
                  onDisconnect={() => handleDisconnect(p.id)}
                />
              ))}
            </Stack>
          </Stack>
        )}

        <Alert severity="info" sx={{ borderRadius: 2 }}>
          All connections are read-only and can be revoked from your creator
          settings at any time. VibeStack never stores raw transaction data.
        </Alert>

        <Divider />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <Button
            variant="text"
            onClick={handleSkip}
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            Skip — I'll verify later
          </Button>
          <Button
            variant="contained"
            endIcon={<RocketLaunchRoundedIcon />}
            onClick={handleFinish}
            sx={{
              borderRadius: 999,
              textTransform: "none",
              fontWeight: 700,
              px: 3,
              background:
                "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
              boxShadow: "none",
            }}
          >
            {anyConnected ? "Finish & claim badge" : "Finish without verifying"}
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}

function ProviderRow({
  provider,
  connected,
  busy,
  onConnect,
  onDisconnect,
}: {
  provider: ProviderCard;
  connected: boolean;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        borderColor: connected ? "rgba(16,185,129,0.45)" : "#ececec",
        background: connected ? "rgba(16,185,129,0.04)" : "#fff",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "flex-start", sm: "center" }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            background: provider.accent,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {provider.initials}
        </Box>
        <Stack sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography fontWeight={700}>{provider.name}</Typography>
            {connected && (
              <Chip
                size="small"
                color="success"
                icon={<CheckCircleRoundedIcon sx={{ fontSize: 14 }} />}
                label="Connected"
                sx={{ height: 22 }}
              />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {provider.description}
          </Typography>
        </Stack>
        {connected ? (
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            onClick={onDisconnect}
            sx={{ textTransform: "none", borderRadius: 999 }}
          >
            Disconnect
          </Button>
        ) : (
          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={onConnect}
            disabled={busy}
            endIcon={<LaunchRoundedIcon sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: "none",
              borderRadius: 999,
              boxShadow: "none",
              minWidth: 120,
            }}
          >
            {busy ? "Connecting…" : "Connect"}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
