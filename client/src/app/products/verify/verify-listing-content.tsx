"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
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
import GoogleIcon from '@mui/icons-material/Google';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import { APP_NAME, STORAGE_PREFIX } from "@/brand";
import { useAuth } from "@/context/auth-context";

const PENDING_LISTING_KEY = `${STORAGE_PREFIX}.pendingListing`;
const LEGACY_PENDING_LISTING_KEY = "vibestack.pendingListing";
const VERIFY_GA_RETURN_PREFIX = `${STORAGE_PREFIX}.verifyGaReturn`;
const VERIFY_RC_RETURN_PREFIX = `${STORAGE_PREFIX}.verifyRcReturn`;

function clearVerifyOAuthReturnDedupe(prefix: string) {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}
import {
  BRAND_PALETTE,
  brandContainedButtonSx,
} from "@/theme/brand-palette";
import { useApiFetchOrThrow } from "@/hooks/use-api-fetch";
import type { AnalyticsProvider, Listing } from "../../../../types";

import { GaPropertyPicker, RevenueCatLinker } from "./integration-pickers";

type Kind = "sales" | "analytics";

type ProviderCard = {
  id: AnalyticsProvider;
  name: string;
  kind: Kind;
  description: string;
  accent: string;
  initials: string;
  /** When set, shown instead of initials (e.g. Google G mark). */
  logoSrc?: string;
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
    logoSrc: "/logo-rc-small.svg"
  },
  // {
  //   id: "stripe",
  //   name: "Stripe",
  //   kind: "sales",
  //   description:
  //     "Authorize read-only access to pull verified lifetime revenue and monthly payouts.",
  //   accent: "#635bff",
  //   initials: "S",
  // },
  {
    id: "google-analytics",
    name: "Google Analytics",
    kind: "analytics",
    description:
      "Connect GA4 via Google OAuth (separate from Firebase sign-in): read-only Analytics access after you approve on Google.",
    accent: "#fff",
    initials: "GA",
    logoSrc: "/google-g.svg",
  },
];

type PendingListing = {
  _id?: string;
  appName?: string;
  tagline?: string;
  hasSalesToVerify?: boolean;
  hasAnalyticsToVerify?: boolean;
};

export default function VerifyListingContent() {
  const router = useRouter();
  const { isLoggedIn, hydrated } = useAuth();
  const { apiFetch } = useApiFetchOrThrow();

  const [connected, setConnected] = useState<Record<AnalyticsProvider, boolean>>(
    {
      revenuecat: false,
      stripe: false,
      "google-analytics": false,
      mixpanel: false,
      plausible: false,
    },
  );
  const [connecting, setConnecting] = useState<AnalyticsProvider | null>(null);
  const [disconnecting, setDisconnecting] = useState<AnalyticsProvider | null>(
    null,
  );
  const [pending, setPending] = useState<PendingListing | null>(null);
  const [gaOauthError, setGaOauthError] = useState<string | null>(null);
  const [rcOauthError, setRcOauthError] = useState<string | null>(null);
  const [showGaPropertyPicker, setShowGaPropertyPicker] = useState(false);
  const [showRcLinker, setShowRcLinker] = useState(false);

  const [bootListingId, setBootListingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw =
        sessionStorage.getItem(PENDING_LISTING_KEY) ??
        sessionStorage.getItem(LEGACY_PENDING_LISTING_KEY);
      if (raw) setPending(JSON.parse(raw) as PendingListing);
    } catch {
      // ignore
    }
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const lid = new URLSearchParams(window.location.search)
      .get("listingId")
      ?.trim();
    if (lid) setBootListingId(lid);
  }, []);

  useEffect(() => {
    if (!bootListingId || !hydrated || !isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await apiFetch<Listing>(
          `/listings/${encodeURIComponent(bootListingId)}`,
          "GET",
        );
        if (cancelled || !row) return;
        const next: PendingListing = {
          _id: String(row._id),
          appName: row.appName,
          tagline: row.tagline,
          hasSalesToVerify: row.hasSalesToVerify ?? true,
          hasAnalyticsToVerify: true,
        };
        setPending((prev) => ({ ...prev, ...next }));
        if (row.googleAnalyticsPropertyResourceName?.trim()) {
          setConnected((prev) => ({ ...prev, "google-analytics": true }));
        }
        if (row.revenueCatProjectId?.trim()) {
          setConnected((prev) => ({ ...prev, revenuecat: true }));
        }
        try {
          sessionStorage.setItem(
            PENDING_LISTING_KEY,
            JSON.stringify({ ...next }),
          );
        } catch {
          // ignore
        }
      } catch {
        // ignore - session-only flow still works
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootListingId, hydrated, isLoggedIn, apiFetch]);

  const activeListingId = pending?._id ?? bootListingId;

  useEffect(() => {
    if (!hydrated || !isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const [gaStatus, rcStatus] = await Promise.all([
          apiFetch<{ connected?: boolean }>(
            "/integrations/google-analytics/status",
            "GET",
          ),
          apiFetch<{ connected?: boolean }>(
            "/integrations/revenuecat/status",
            "GET",
          ),
        ]);
        if (cancelled) return;
        if (gaStatus?.connected) {
          setConnected((prev) => ({ ...prev, "google-analytics": true }));
        }
        if (rcStatus?.connected) {
          setConnected((prev) => ({ ...prev, revenuecat: true }));
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, isLoggedIn, apiFetch]);

  /**
   * One-shot: read the real URL query on the client (no `useSearchParams` subscription).
   * Strip GA OAuth params with `replace` so this cannot re-fire on every render.
   */
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const qs = window.location.search;
    if (!qs) return;

    const sp = new URLSearchParams(qs);
    const gaOk = sp.get("ga_connected");
    const gaErr = sp.get("ga_error");
    const rcOk = sp.get("rc_connected");
    const rcErr = sp.get("rc_error");
    const hasGa = gaOk === "1" || Boolean(gaErr);
    const hasRc = rcOk === "1" || Boolean(rcErr);
    if (!hasGa && !hasRc) return;

    const listingIdPreserve = sp.get("listingId")?.trim();

    if (hasGa) {
      const dedupeKey = `${VERIFY_GA_RETURN_PREFIX}:${qs}`;
      try {
        if (sessionStorage.getItem(dedupeKey)) return;
        sessionStorage.setItem(dedupeKey, "1");
      } catch {
        // ignore
      }

      if (gaOk === "1") {
        setGaOauthError(null);
        void (async () => {
          try {
            const status = await apiFetch<{ connected?: boolean }>(
              "/integrations/google-analytics/status",
              "GET",
            );
            if (!status?.connected) {
              setGaOauthError(
                "Google sign-in finished but the connection was not saved. Try Connect again.",
              );
              setConnected((prev) => ({ ...prev, "google-analytics": false }));
              return;
            }
            setConnected((prev) => ({ ...prev, "google-analytics": true }));
            setShowGaPropertyPicker(true);
          } catch (e) {
            const msg =
              e instanceof Error ? e.message : "Could not confirm GA connection.";
            setGaOauthError(msg);
          }
        })();
      } else if (gaErr) {
        const decoded = decodeURIComponent(gaErr);
        setGaOauthError(
          decoded === "no_refresh_token"
            ? "Google did not issue a new refresh token. Disconnect Google Analytics in your Google Account permissions for this app, then connect again."
            : decoded,
        );
      }
    }

    if (hasRc) {
      const dedupeKey = `${VERIFY_RC_RETURN_PREFIX}:${qs}`;
      try {
        if (sessionStorage.getItem(dedupeKey)) return;
        sessionStorage.setItem(dedupeKey, "1");
      } catch {
        // ignore
      }

      if (rcOk === "1") {
        setRcOauthError(null);
        void (async () => {
          try {
            const status = await apiFetch<{ connected?: boolean }>(
              "/integrations/revenuecat/status",
              "GET",
            );
            if (!status?.connected) {
              setRcOauthError(
                "RevenueCat authorization finished but the connection was not saved. Try Connect again.",
              );
              setConnected((prev) => ({ ...prev, revenuecat: false }));
              return;
            }
            setConnected((prev) => ({ ...prev, revenuecat: true }));
            setShowRcLinker(true);
          } catch (e) {
            const msg =
              e instanceof Error ? e.message : "Could not confirm RevenueCat connection.";
            setRcOauthError(msg);
          }
        })();
      } else if (rcErr) {
        const decoded = decodeURIComponent(rcErr);
        setRcOauthError(
          decoded === "no_refresh_token"
            ? "RevenueCat did not return a refresh token. Disconnect and connect again."
            : decoded,
        );
      }
    }

    router.replace(
      listingIdPreserve
        ? `/products/verify?listingId=${encodeURIComponent(listingIdPreserve)}`
        : "/products/verify",
      { scroll: false },
    );
  }, [router, apiFetch]);

  const salesConnected = useMemo(
    () =>
      PROVIDERS.filter((p) => p.kind === "sales").some((p) => connected[p.id]),
    [connected],
  );
  const analyticsConnected = useMemo(
    () =>
      PROVIDERS.filter((p) => p.kind === "analytics").some(
        (p) => connected[p.id],
      ),
    [connected],
  );
  const anyConnected = salesConnected || analyticsConnected;

  const handleConnect = async (id: AnalyticsProvider) => {
    setGaOauthError(null);
    setRcOauthError(null);

    if (id === "google-analytics") {
      if (!hydrated || !isLoggedIn) {
        setGaOauthError("Please sign in to connect Google Analytics.");
        return;
      }
      clearVerifyOAuthReturnDedupe(VERIFY_GA_RETURN_PREFIX);
      setConnecting(id);
      try {
        const startQs = activeListingId
          ? `?listingId=${encodeURIComponent(activeListingId)}`
          : "";
        const data = await apiFetch<{ authorizationUrl?: string }>(
          `/integrations/google-analytics/start${startQs}`,
          "GET",
        );
        const url = data?.authorizationUrl;
        if (!url) {
          throw new Error("Server did not return an authorization URL.");
        }
        window.location.assign(url);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Could not start Google Analytics.";
        setGaOauthError(msg);
        setConnecting(null);
      }
      return;
    }

    if (id === "revenuecat") {
      if (!hydrated || !isLoggedIn) {
        setRcOauthError("Please sign in to connect RevenueCat.");
        return;
      }
      clearVerifyOAuthReturnDedupe(VERIFY_RC_RETURN_PREFIX);
      setConnecting(id);
      try {
        const startQs = activeListingId
          ? `?listingId=${encodeURIComponent(activeListingId)}`
          : "";
        const data = await apiFetch<{ authorizationUrl?: string }>(
          `/integrations/revenuecat/start${startQs}`,
          "GET",
        );
        const url = data?.authorizationUrl;
        if (!url) {
          throw new Error("Server did not return an authorization URL.");
        }
        window.location.assign(url);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Could not start RevenueCat OAuth.";
        setRcOauthError(msg);
        setConnecting(null);
      }
      return;
    }

    setConnecting(id);
    await new Promise((r) => setTimeout(r, 700));
    setConnected((prev) => ({ ...prev, [id]: true }));
    setConnecting(null);
  };

  const handleDisconnect = async (id: AnalyticsProvider) => {
    if (id === "google-analytics") {
      setDisconnecting(id);
      try {
        await apiFetch("/integrations/google-analytics/disconnect", "POST", {
          listingId: activeListingId ?? undefined,
          clearListingProperty: Boolean(activeListingId),
        });
        clearVerifyOAuthReturnDedupe(VERIFY_GA_RETURN_PREFIX);
        setShowGaPropertyPicker(false);
        setGaOauthError(null);
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "Could not disconnect Google Analytics.";
        setGaOauthError(msg);
      } finally {
        setDisconnecting(null);
      }
    }
    if (id === "revenuecat") {
      setDisconnecting(id);
      try {
        await apiFetch("/integrations/revenuecat/disconnect", "POST", {
          listingId: activeListingId ?? undefined,
          clearListingProject: Boolean(activeListingId),
        });
        clearVerifyOAuthReturnDedupe(VERIFY_RC_RETURN_PREFIX);
        setShowRcLinker(false);
        setRcOauthError(null);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Could not disconnect RevenueCat.";
        setRcOauthError(msg);
      } finally {
        setDisconnecting(null);
      }
    }
    setConnected((prev) => ({ ...prev, [id]: false }));
    if (id === "revenuecat") setShowRcLinker(false);
  };

  const handleFinish = () => {
    try {
      sessionStorage.setItem(
        PENDING_LISTING_KEY,
        JSON.stringify({
          ...(pending || {}),
          verifiedProviders: (Object.keys(connected) as AnalyticsProvider[])
            .filter((k) => connected[k]),
          isListingVerified: salesConnected,
          isAnalyticsVerified: analyticsConnected,
        }),
      );
    } catch {
      // ignore
    }
    router.push("/products?listed=1");
  };

  const handleSkip = () => router.push("/products?listed=1");

  const handleOpenPropertyPicker = () => {
    setShowGaPropertyPicker(prev => !prev);
  }

  const showSalesSection = pending?.hasSalesToVerify !== false;
  const showAnalyticsSection =
    Boolean(bootListingId) || pending?.hasAnalyticsToVerify !== false;

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            color: BRAND_PALETTE.charcoal,
            overflow: "hidden",
            position: "relative",
            backgroundColor: BRAND_PALETTE.mint,
            border: `1px solid ${BRAND_PALETTE.sage}`,
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
                backgroundColor: "#fff",
                color: BRAND_PALETTE.seafoam,
                border: `1px solid ${BRAND_PALETTE.sage}`,
                fontWeight: 600,
              }}
            />

            <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
              Verify {pending?.appName ? <b>{pending.appName}</b> : "your listing"}
              &rsquo;s sales &amp; analytics.
            </Typography>
            <Typography sx={{ color: "rgba(37, 52, 58, 0.85)", maxWidth: 640 }}>
              Listings with verified metrics sell roughly <b>2.4× faster</b> and
              for a higher multiple. Connect any of the sources below - read-only,
              and you can disconnect anytime. This step is 100% optional.
            </Typography>

            <Paper
              elevation={0}
              sx={{
                mt: 1,
                p: 2,
                borderRadius: 3,
                backgroundColor: "#fff",
                border: `1px solid ${BRAND_PALETTE.sage}`,
                width: "fit-content",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    backgroundColor: BRAND_PALETTE.seafoam,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: BRAND_PALETTE.onPrimary,
                  }}
                >
                  <ShieldRoundedIcon />
                </Box>
                <Stack>
                  <Typography sx={{ fontWeight: 800 }}>
                    Verified Sales &amp; Analytics
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {anyConnected
                      ? "Badge unlocked - buyers will see this on your listing."
                      : "Connect at least one source to unlock the badge."}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Paper>

        {gaOauthError ? (
          <Alert
            severity="error"
            onClose={() => setGaOauthError(null)}
            sx={{ borderRadius: 2 }}
          >
            {gaOauthError}
          </Alert>
        ) : null}

        {rcOauthError ? (
          <Alert
            severity="error"
            onClose={() => setRcOauthError(null)}
            sx={{ borderRadius: 2 }}
          >
            {rcOauthError}
          </Alert>
        ) : null}

        
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
                  busy={connecting === p.id || disconnecting === p.id}
                  onConnect={() => void handleConnect(p.id)}
                  onDisconnect={() => void handleDisconnect(p.id)}
                />
              ))}
            </Stack>
          </Stack>
        

        {showRcLinker ? (
          <RevenueCatLinker
            listingId={activeListingId}
            open={showRcLinker}
            onLinked={() => setShowRcLinker(false)}
            onNeedsReconnect={() => {
              setConnected((prev) => ({ ...prev, revenuecat: false }));
              setShowRcLinker(false);
              setRcOauthError(
                "RevenueCat access expired or is missing permissions. Connect again and approve the requested scopes.",
              );
            }}
          />
        ) : null}

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
              Show verified usage - MAUs, sessions, retention or conversion.
            </Typography>
            <Stack spacing={1}>
              {PROVIDERS.filter((p) => p.kind === "analytics").map((p) => (
                <ProviderRow
                  key={p.id}
                  provider={p}
                  connected={connected[p.id]}
                  busy={connecting === p.id || disconnecting === p.id}
                  onConnect={() => void handleConnect(p.id)}
                  onDisconnect={() => void handleDisconnect(p.id)}
                />
              ))}
              <Stack direction="row" spacing={1}>
              <Button endIcon={showGaPropertyPicker ? <ExpandMoreIcon /> :  <ExpandLessIcon />} startIcon={<GoogleIcon />} variant="outlined" sx={{ color: '#000', borderColor: '#000'}} size="small" onClick={handleOpenPropertyPicker}>
                Select Analytics Property
              </Button>
              {/* <Divider orientation="vertical" flexItem />
              <Button variant="outlined" sx={{ color: '#000', borderColor: '#000'}} size="small" onClick={handleOpenPropertyPicker}>
                Select RevenueCat Project
              </Button> */}
              </Stack>
            </Stack>
          </Stack>
        )}

        {showGaPropertyPicker ? (
          <GaPropertyPicker
            listingId={activeListingId}
            open={showGaPropertyPicker}
            onLinked={() => setShowGaPropertyPicker(false)}
            onClose={() => setShowGaPropertyPicker(false)}
            onNeedsReconnect={() => {
              setConnected((prev) => ({ ...prev, "google-analytics": false }));
              setShowGaPropertyPicker(false);
              setGaOauthError(
                "Google Analytics access expired or is missing permissions. Connect again and approve all requested scopes.",
              );
            }}
          />
        ) : null}

       

        <Alert severity="info" sx={{ borderRadius: 2 }}>
          All connections are read-only and can be revoked from your creator
          settings at any time. {APP_NAME} never stores raw transaction data.
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
            Skip - I&apos;ll verify later
          </Button>
          <Button
            variant="contained"
            endIcon={<RocketLaunchRoundedIcon />}
            onClick={handleFinish}
            sx={{ borderRadius: 999, px: 3, ...brandContainedButtonSx }}
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
            background: provider.logoSrc ? "#fff" : provider.accent,
            color: provider.logoSrc ? "inherit" : "#fff",
            border: provider.logoSrc ? "1px solid #ececec" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {provider.logoSrc ? (
            <Box
              component="img"
              src={provider.logoSrc}
              alt=""
              aria-hidden
              sx={{ width: 24, height: 24, display: "block" }}
            />
          ) : (
            provider.initials
          )}
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
