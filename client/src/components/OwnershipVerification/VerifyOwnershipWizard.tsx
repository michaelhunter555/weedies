"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import GppGoodRoundedIcon from "@mui/icons-material/GppGoodRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";

import { APP_NAME } from "@/brand";
import { useAuth } from "@/context/auth-context";
import { useOwnershipVerification } from "@/hooks/use-ownership-verification";
import {
  listingHasStoreVerificationOption,
  ownershipVerificationSummary,
  type OwnershipVerificationCheckMethod,
} from "@/lib/ownership-verification";
import {
  BRAND_PALETTE,
  brandContainedButtonSx,
} from "@/theme/brand-palette";

import { OwnershipTokenDisplay } from "./OwnershipTokenDisplay";
import { PlatformPlacementGuide } from "./PlatformPlacementGuide";

const STEPS = ["Overview", "Your token", "Add to your app", "Verify"] as const;

export default function VerifyOwnershipWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listingId")?.trim() ?? "";
  const { isLoggedIn, hydrated } = useAuth();
  const { fetchOwnershipVerification, checkOwnershipVerification } =
    useOwnershipVerification();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkingMethod, setCheckingMethod] =
    useState<OwnershipVerificationCheckMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [checkOk, setCheckOk] = useState<boolean | null>(null);
  const [payload, setPayload] = useState<Awaited<
    ReturnType<typeof fetchOwnershipVerification>
  > | null>(null);

  const load = useCallback(async () => {
    if (!listingId) {
      setLoading(false);
      setError("Missing listing id.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOwnershipVerification(listingId);
      setPayload(data);
      if (data.isVerified) {
        setActiveStep(STEPS.length - 1);
        setCheckOk(true);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not load ownership verification.";
      setError(msg);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [fetchOwnershipVerification, listingId]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) {
      router.replace(`/signup?next=${encodeURIComponent(`/verify-ownership?listingId=${listingId}`)}`);
      return;
    }
    void load();
  }, [hydrated, isLoggedIn, listingId, load, router]);

  const canCheckWebsite = Boolean(payload?.webOrigin && payload?.verificationToken);
  const canCheckStore = Boolean(
    payload?.storeListingCode &&
      (payload.storeListingUrls?.ios || payload.storeListingUrls?.android),
  );
  const showStoreCode = Boolean(
    payload && listingHasStoreVerificationOption(payload.platforms),
  );

  const handleCheck = async (method: OwnershipVerificationCheckMethod) => {
    if (!listingId) return;
    setCheckingMethod(method);
    setCheckMessage(null);
    setCheckOk(null);
    try {
      const result = await checkOwnershipVerification(listingId, method);
      setCheckOk(result.ok);
      setCheckMessage(result.message);
      if (result.ok) {
        setPayload((prev) =>
          prev
            ? {
                ...prev,
                isVerified: true,
                verifiedVia: result.verifiedVia ?? method,
                dateVerified: result.dateVerified ?? new Date().toISOString(),
              }
            : prev,
        );
      }
    } catch (err) {
      setCheckOk(false);
      const errPayload = (err as {
        payload?: { message?: string; checkedUrl?: string; checkedUrls?: string[] };
      })?.payload;
      const urlNote =
        errPayload?.checkedUrl ??
        (errPayload?.checkedUrls?.length
          ? errPayload.checkedUrls.join(", ")
          : undefined);
      const detail = urlNote
        ? `${errPayload?.message ?? "Verification check failed."} (${urlNote})`
        : undefined;
      setCheckMessage(
        detail ??
          (err instanceof Error ? err.message : "Verification check failed."),
      );
    } finally {
      setCheckingMethod(null);
    }
  };

  const productHref = useMemo(() => {
    if (!payload?.listingId) return "/products";
    return `/products/${encodeURIComponent(payload.listingId)}`;
  }, [payload?.listingId]);

  if (!hydrated || !isLoggedIn) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <GppGoodRoundedIcon sx={{ color: BRAND_PALETTE.seafoam }} />
            <Typography variant="h4" fontWeight={800}>
              Verify ownership
            </Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary">
            {ownershipVerificationSummary()}
          </Typography>
          {payload?.appName ? (
            <Typography variant="body2" color="text.secondary">
              Listing: <strong>{payload.appName}</strong>
            </Typography>
          ) : null}
        </Stack>

        <Stepper activeStep={activeStep} alternativeLabel sx={{ display: { xs: "none", sm: "flex" } }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          ) : (
            <Stack spacing={3}>
              {activeStep === 0 ? (
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>
                    Why verify ownership?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {APP_NAME} confirms you control the app you listed. This is separate
                    from Google Analytics or RevenueCat, which prove metrics, not app
                    control.
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      • <strong>Website (primary):</strong> add{" "}
                      <Box component="span" sx={{ fontFamily: "monospace" }}>
                        dap-and-flip-app-verification.txt
                      </Box>{" "}
                      inside your existing{" "}
                      <Box component="span" sx={{ fontFamily: "monospace" }}>
                        .well-known
                      </Box>{" "}
                      folder (one folder per site, not a second copy)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • <strong>Store listing (iOS / Android backup):</strong> paste a
                      short code into your App Store or Play Store listing text
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • We fetch the public URL or store page and mark the listing
                      verified when the code matches
                    </Typography>
                  </Stack>
                  {payload?.isVerified ? (
                    <Alert severity="success" icon={<VerifiedRoundedIcon />} sx={{ borderRadius: 2 }}>
                      Ownership is already verified for this listing.
                    </Alert>
                  ) : null}
                </Stack>
              ) : null}

              {activeStep === 1 && payload?.verificationToken ? (
                <OwnershipTokenDisplay
                  verificationToken={payload.verificationToken}
                  storeListingCode={payload.storeListingCode}
                  showStoreCode={showStoreCode}
                />
              ) : null}

              {activeStep === 2 && payload ? (
                <PlatformPlacementGuide
                  guides={payload.platformGuides}
                  webOrigin={payload.webOrigin}
                  verificationCheckUrl={payload.verificationCheckUrl}
                  storeListingCode={payload.storeListingCode}
                />
              ) : null}

              {activeStep === 3 ? (
                <Stack spacing={2}>
                  {payload?.isVerified ? (
                    <Alert
                      severity="success"
                      icon={<CheckCircleRoundedIcon />}
                      sx={{ borderRadius: 2 }}
                    >
                      Ownership verified
                      {payload.dateVerified
                        ? ` on ${new Date(payload.dateVerified).toLocaleString()}`
                        : ""}
                      .
                    </Alert>
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        Run the check that matches how you published your proof. Website
                        verification uses your{" "}
                        {payload?.webOrigin ? (
                          <Box component="span" sx={{ fontFamily: "monospace" }}>
                            {payload.wellKnownPath}
                          </Box>
                        ) : (
                          "well-known file"
                        )}
                        . Store verification fetches your App Store or Play Store listing
                        and searches for your store code.
                      </Typography>
                      {!canCheckWebsite && !canCheckStore ? (
                        <Alert severity="warning" sx={{ borderRadius: 2 }}>
                          Add a Web or Live URL, or your App Store / Play Store listing
                          URL on this listing before checking.
                        </Alert>
                      ) : null}
                      {checkMessage ? (
                        <Alert
                          severity={checkOk ? "success" : "error"}
                          sx={{ borderRadius: 2 }}
                        >
                          {checkMessage}
                        </Alert>
                      ) : null}
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <Button
                          variant="contained"
                          disabled={!canCheckWebsite || checkingMethod !== null}
                          onClick={() => void handleCheck("well_known")}
                          startIcon={
                            checkingMethod === "well_known" ? (
                              <CircularProgress size={18} color="inherit" />
                            ) : (
                              <VerifiedRoundedIcon />
                            )
                          }
                          sx={{ ...brandContainedButtonSx, textTransform: "none" }}
                        >
                          {checkingMethod === "well_known"
                            ? "Checking website…"
                            : "Check website file"}
                        </Button>
                        {showStoreCode ? (
                          <Button
                            variant="outlined"
                            disabled={!canCheckStore || checkingMethod !== null}
                            onClick={() => void handleCheck("store_listing")}
                            startIcon={
                              checkingMethod === "store_listing" ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                <VerifiedRoundedIcon />
                              )
                            }
                            sx={{ textTransform: "none", fontWeight: 600 }}
                          >
                            {checkingMethod === "store_listing"
                              ? "Checking store listing…"
                              : "Check store listing"}
                          </Button>
                        ) : null}
                      </Stack>
                    </>
                  )}
                </Stack>
              ) : null}

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                justifyContent="space-between"
              >
                <Button
                  variant="text"
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                  sx={{ textTransform: "none" }}
                >
                  Back
                </Button>
                <Stack direction="row" spacing={1.5}>
                  {activeStep < STEPS.length - 1 ? (
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep((s) => Math.min(STEPS.length - 1, s + 1))}
                      sx={{ ...brandContainedButtonSx, textTransform: "none" }}
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      href={productHref}
                      startIcon={<LinkRoundedIcon />}
                      sx={{ textTransform: "none", fontWeight: 600 }}
                    >
                      Back to listing
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Stack>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
