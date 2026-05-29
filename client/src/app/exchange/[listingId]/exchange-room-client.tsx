"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-io/socket-provider";
import { Notifications } from "@/context/socket-io/events";
import { useEscrow } from "@/hooks/use-escrow";
import { useListings } from "@/hooks/use-listings";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import {
  Alert,
  Box,
  Button,
  CardMedia,
  Container,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useStripeWallet } from "@/hooks/use-stripe-wallet";
import { ExchangeDisputeSection } from "@/components/Exchange/ExchangeDisputeSection";

import type { ListingExchangeDeliverable, ListingExchangePayload } from "../../../../types";

const PLACEHOLDER = "/placeholder-app-cover.svg";
const MAX_BYTES = 8 * 1024 * 1024;

function coverFromListing(listing: ListingExchangePayload["listing"]): string {
  const photos = listing.photos ?? [];
  if (!photos.length) return PLACEHOLDER;
  const idx = Math.min(Math.max(0, listing.coverIndex ?? 0), photos.length - 1);
  return photos[idx] ?? PLACEHOLDER;
}

const EXCHANGE_STEPS_STRIPE = [
  "Authorize & capture",
  "Funds captured",
  "Buyer confirmed",
  "Optional review",
] as const;

const EXCHANGE_STEPS_ESCROW = [
  "Waiting for payment",
  "Funds secured",
  "Buyer confirmed",
  "Optional review",
] as const;

export function ExchangeRoomClient() {
  const params = useParams<{ listingId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const isMobileStepper = useMediaQuery(theme.breakpoints.down("md"));
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { user, isLoggedIn, hydrated } = useAuth();
  const {
    getListingExchange,
    uploadExchangeDeliverables,
    confirmListingExchange,
    submitExchangeReview,
  } = useListings();
  const { managePaymentCapture } = useStripeWallet();
  const { getEscrowTransactionStatus, cancelEscrowTransaction } = useEscrow();
  const { socket } = useSocket();

  const listingId = decodeURIComponent(params?.listingId ?? "").trim();
  const walletHref =
    user?.id != null && String(user.id).length > 0
      ? `/my-settings/${encodeURIComponent(String(user.id))}/wallet`
      : "/signup";
  const resolutionCenterHref =
    user?.id != null && String(user.id).length > 0
      ? `/my-settings/${encodeURIComponent(String(user.id))}/resolution-center`
      : "/";

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [paymentActionError, setPaymentActionError] = useState<string | null>(null);
  /** "" = no numeric rating (written-only review allowed). */
  const [reviewStarChoice, setReviewStarChoice] = useState<string>("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [escrowCancelError, setEscrowCancelError] = useState<string | null>(null);

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["listing-exchange", listingId],
    queryFn: () => getListingExchange(listingId),
    enabled: Boolean(hydrated && isLoggedIn && listingId),
  });

  const escrowTxId =
    data?.transaction?.paymentType === "escrow"
      ? data.transaction.escrowTransactionId ?? null
      : null;

  const escrowStatusQ = useQuery({
    queryKey: ["escrow-tx-status", escrowTxId],
    queryFn: () => getEscrowTransactionStatus(escrowTxId!),
    enabled: Boolean(
      escrowTxId &&
        data?.transaction?.paymentStatus === "pending" &&
        data.exchange.paymentStatus !== "canceled",
    ),
    staleTime: 30_000,
  });

  const cancelEscrowMutation = useMutation({
    mutationFn: () => cancelEscrowTransaction(escrowTxId!),
    onSuccess: async () => {
      setEscrowCancelError(null);
      await queryClient.invalidateQueries({ queryKey: ["listing-exchange", listingId] });
      if (escrowTxId) {
        await queryClient.invalidateQueries({ queryKey: ["escrow-tx-status", escrowTxId] });
      }
    },
    onError: (e: Error) => {
      setEscrowCancelError(e.message ?? "Could not cancel Escrow transaction.");
    },
  });

  useEffect(() => {
    if (!socket || !listingId) return;

    const refreshIfMatch = (payload: { listingId?: unknown }) => {
      const lid =
        typeof payload?.listingId === "string" ? payload.listingId.trim() : "";
      if (lid && lid === listingId) {
        void queryClient.invalidateQueries({
          queryKey: ["listing-exchange", listingId],
        });
      }
    };

    socket.on(Notifications.PURCHASE_SUCCEEDED, refreshIfMatch);
    socket.on(Notifications.PURCHASE_CANCELED, refreshIfMatch);
    socket.on(Notifications.EXCHANGE_UPDATED, refreshIfMatch);

    return () => {
      socket.off(Notifications.PURCHASE_SUCCEEDED, refreshIfMatch);
      socket.off(Notifications.PURCHASE_CANCELED, refreshIfMatch);
      socket.off(Notifications.EXCHANGE_UPDATED, refreshIfMatch);
    };
  }, [socket, listingId, queryClient]);

  const [recentCaptureAction, setRecentCaptureAction] =
    useState<"capture" | "cancel" | null>(null);

  const acceptPaymentMutation = useMutation({
    mutationFn: async (action: "capture" | "cancel") => {
      return await managePaymentCapture(listingId, action);
    },
    onSuccess: async (_data, action) => {
      setPaymentActionError(null);
      setRecentCaptureAction(action);
      await queryClient.invalidateQueries({ queryKey: ["listing-exchange", listingId] });
    },
    onError: (e: Error) => {
      setPaymentActionError(e?.message ?? "Could not update payment");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => uploadExchangeDeliverables(listingId, files),
    onSuccess: async () => {
      setUploadError(null);
      await queryClient.invalidateQueries({ queryKey: ["listing-exchange", listingId] });
    },
    onError: (e: Error) => {
      setUploadError(e?.message ?? "Upload failed");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmListingExchange(listingId),
    onSuccess: async () => {
      setConfirmError(null);
      await queryClient.invalidateQueries({ queryKey: ["listing-exchange", listingId] });
    },
    onError: (e: Error) => {
      setConfirmError(e?.message ?? "Could not confirm");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      submitExchangeReview(listingId, {
        ...(reviewStarChoice !== "" ? { rating: Number(reviewStarChoice) } : {}),
        comment: reviewComment.trim(),
      }),
    onSuccess: async () => {
      setReviewError(null);
      setReviewStarChoice("");
      setReviewComment("");
      await queryClient.invalidateQueries({ queryKey: ["listing-exchange", listingId] });
    },
    onError: (e: Error) => {
      setReviewError(e?.message ?? "Could not submit review");
    },
  });

  const handlePickFiles = () => fileRef.current?.click();

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (!list.length) return;
    const tooLarge = list.find((f) => f.size > MAX_BYTES);
    if (tooLarge) {
      setUploadError(
        `Each file must be ${MAX_BYTES / (1024 * 1024)} MB or smaller (logos, NDAs, small docs).`,
      );
      return;
    }
    uploadMutation.mutate(list);
  };

  if (!listingId) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="warning">Missing listing.</Alert>
      </Container>
    );
  }

  if (!hydrated) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
        <LinearProgress sx={{ width: 200 }} />
      </Box>
    );
  }

  if (!isLoggedIn) {
    const returnUrl = `/exchange/${encodeURIComponent(listingId)}`;
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="info">
          Sign in to open the success room for this sale.
        </Alert>
        <Button
          component={Link}
          href={`/signup?returnUrl=${encodeURIComponent(returnUrl)}`}
          sx={{ mt: 2 }}
          variant="contained"
        >
          Sign in
        </Button>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 12 }}>
        <LinearProgress />
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">
          {error instanceof Error ? error.message : "Could not load this exchange."}
        </Alert>
        <Button component={Link} href="/products" sx={{ mt: 2 }} variant="outlined">
          Back to marketplace
        </Button>
      </Container>
    );
  }

  const { exchange, listing, role, buyerReview, transaction, escrowAwaitingFunds } =
    data;
  const buyerReviewSnapshot = buyerReview ?? null;
  const isEscrow = transaction?.paymentType === "escrow";
  const exchangeSteps = isEscrow ? EXCHANGE_STEPS_ESCROW : EXCHANGE_STEPS_STRIPE;
  const paymentAuthorized = Boolean(exchange.paymentReceivedAt);
  const paymentStatus = exchange.paymentStatus ?? "pending";
  const saleCanceled = paymentStatus === "canceled";
  const saleDisputed = paymentStatus === "disputed";
  const fundsCaptured =
    Boolean(exchange.sellerCapturedPayment) || paymentStatus === "succeeded";
  const handoverDone = Boolean(exchange.buyerConfirmedAt);
  const captureDeadlineMs = exchange.paymentCaptureExpiration
    ? new Date(exchange.paymentCaptureExpiration).getTime()
    : null;
  const captureWindowExpired =
    captureDeadlineMs != null &&
    Number.isFinite(captureDeadlineMs) &&
    Date.now() > captureDeadlineMs;
  const captureDeadlineLabel =
    exchange.paymentCaptureExpiration != null
      ? new Date(exchange.paymentCaptureExpiration).toLocaleString()
      : null;

  const reviewDone = role !== "buyer" || Boolean(buyerReviewSnapshot);
  const stepPaymentReady = paymentAuthorized;
  const stepCaptureResolved = fundsCaptured || saleCanceled;
  const stepBuyerConfirmed = handoverDone;
  const stepReviewDone = reviewDone;
  const activeStep = !stepPaymentReady
    ? 0
    : !stepCaptureResolved
      ? 0
      : !stepBuyerConfirmed
        ? 2
        : !stepReviewDone
          ? 3
          : 3;

  const listingPath = (() => {
    const id = listing._id;
    const slug = listing.slug?.trim();
    if (slug) return `/products/${encodeURIComponent(id)}/${encodeURIComponent(slug)}`;
    return `/products/${encodeURIComponent(id)}`;
  })();

  const messageCounterpartId =
    role === "buyer" ? exchange.sellerId : exchange.buyerId;
  const messageHref = (() => {
    const q = new URLSearchParams();
    q.set("exchange", "1");
    if (messageCounterpartId) q.set("recipientId", messageCounterpartId);
    q.set("listingId", listing._id);
    if (listing.appName) q.set("subject", listing.appName);
    q.set("counterparty", role === "buyer" ? "seller" : "buyer");
    return `/messages?${q.toString()}`;
  })();
  const messageButtonLabel = role === "buyer" ? "Message seller" : "Message buyer";

  const messageCounterpartyButton = (
    <Button
      component={Link}
      href={messageHref}
      variant="outlined"
      startIcon={<ChatRoundedIcon />}
      disabled={!messageCounterpartId}
      sx={{ textTransform: "none", fontWeight: 600 }}
    >
      {messageButtonLabel}
    </Button>
  );

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 }, minWidth: 0, overflowX: "hidden" }}>
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => router.push(listingPath)}
        sx={{ mb: 2, textTransform: "none" }}
        color="inherit"
      >
        Back to listing
      </Button>

      <Typography variant="h4" fontWeight={800} gutterBottom>
        Success room
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        You are signed in as the <b>{role}</b>.
        {isEscrow ? (
          <>
            {" "}
            Payment and inspection run on Escrow.com. Use this room for optional file
            sharing, buyer confirmation, and reviews after funds are secured.
          </>
        ) : (
          <>
            {" "}
            The buyer pays through checkout; the seller must capture (or cancel) the
            authorized charge before the capture window ends. After capture, the buyer can
            confirm receipt at any time.
          </>
        )}{" "}
        Optional files below are not required to confirm.
      </Typography>

      {escrowAwaitingFunds ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Escrow payment is still in progress on Escrow.com. This room is open for
          coordination, but the sale is not final until we receive a payment webhook
          from Escrow. Buyer confirmation unlocks after funds are secured.
        </Alert>
      ) : null}

      {saleDisputed && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This sale has an open dispute. Payout and handover may be paused until the case
          is resolved. See{" "}
          <Link href={resolutionCenterHref} style={{ fontWeight: 700 }}>
            Resolution center
          </Link>
          .
        </Alert>
      )}

      {transaction && role === "buyer" && fundsCaptured && !saleCanceled && (
        <ExchangeDisputeSection
          listingId={listingId}
          transaction={transaction}
          resolutionCenterHref={resolutionCenterHref}
        />
      )}

      {transaction?.hasDispute && role === "seller" && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={800} gutterBottom>
            Buyer dispute
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Respond in Resolution center. You can accept the refund request or escalate to
            platform review.
          </Typography>
          <Button
            component={Link}
            href={
              transaction.disputeId
                ? `${resolutionCenterHref}/${encodeURIComponent(transaction.disputeId)}`
                : resolutionCenterHref
            }
            variant="contained"
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Open Resolution center
          </Button>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <CardMedia
            component="img"
            src={coverFromListing(listing)}
            alt={listing.appName}
            sx={{
              width: { xs: "100%", sm: 140 },
              height: 100,
              objectFit: "cover",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800}>
              {listing.appName}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ wordBreak: "break-all", display: "block" }}
            >
              Listing ID: {listing._id}
            </Typography>
            {isEscrow && transaction?.escrowTransactionId ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ wordBreak: "break-all", display: "block", mt: 0.5 }}
              >
                Escrow transaction #{transaction.escrowTransactionId}
                {transaction.paymentStatus
                  ? ` · ${transaction.paymentStatus}`
                  : ""}
              </Typography>
            ) : null}
          </Box>
        </Stack>
      </Paper>

      {isMobileStepper ? (
        <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 4 }}>
          <Step completed={stepPaymentReady}>
            <StepLabel
              optional={
                <Typography variant="caption" color="text.secondary">
                  {isEscrow ? "Escrow.com" : "Checkout & seller capture"}
                </Typography>
              }
            >
              {exchangeSteps[0]}
            </StepLabel>
          </Step>
          <Step completed={stepCaptureResolved}>
            <StepLabel>{exchangeSteps[1]}</StepLabel>
          </Step>
          <Step completed={stepBuyerConfirmed}>
            <StepLabel>{exchangeSteps[2]}</StepLabel>
          </Step>
          <Step completed={stepReviewDone}>
            <StepLabel>{exchangeSteps[3]}</StepLabel>
          </Step>
        </Stepper>
      ) : (
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          <Step completed={stepPaymentReady}>
            <StepLabel>{exchangeSteps[0]}</StepLabel>
          </Step>
          <Step completed={stepCaptureResolved}>
            <StepLabel>{exchangeSteps[1]}</StepLabel>
          </Step>
          <Step completed={stepBuyerConfirmed}>
            <StepLabel>{exchangeSteps[2]}</StepLabel>
          </Step>
          <Step completed={stepReviewDone}>
            <StepLabel>{exchangeSteps[3]}</StepLabel>
          </Step>
        </Stepper>
      )}

      {/* Step 1 — payment (Stripe capture or Escrow.com) */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {isEscrow ? "1. Escrow payment" : "1. Payment authorization & capture"}
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          flexWrap="wrap"
          sx={{ mb: 2 }}
        >
          {messageCounterpartyButton}
        </Stack>
        {isEscrow ? (
          <Stack spacing={2}>
            {saleCanceled ? (
              <Alert severity="warning">
                This Escrow transaction was canceled on Escrow.com. The sale cannot proceed
                here until a new checkout is started.
              </Alert>
            ) : fundsCaptured ? (
              <Alert severity="success">
                Escrow reports funds secured. Continue with handover and buyer confirmation
                below.
              </Alert>
            ) : (
              <Alert severity="info">
                {role === "buyer"
                  ? "Complete agree and payment on Escrow.com. Accept or reject terms there, not in this app."
                  : "The buyer pays through Escrow.com. Accept or reject the transaction in your Escrow dashboard."}
              </Alert>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap" alignItems="flex-start">
              {transaction?.escrowTransactionUrl ? (
                <Button
                  component="a"
                  href={transaction.escrowTransactionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  endIcon={<OpenInNewRoundedIcon />}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Open on Escrow.com
                </Button>
              ) : null}
              {escrowStatusQ.data?.canCancel ? (
                <Button
                  variant="outlined"
                  color="error"
                  disabled={cancelEscrowMutation.isPending}
                  onClick={() => {
                    setEscrowCancelError(null);
                    cancelEscrowMutation.mutate();
                  }}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  {cancelEscrowMutation.isPending
                    ? "Cancelling…"
                    : "Cancel Escrow checkout"}
                </Button>
              ) : null}
            </Stack>
            {escrowCancelError ? (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {escrowCancelError}
              </Alert>
            ) : null}
            <Typography variant="caption" color="text.secondary">
              This page updates when Escrow notifies us (usually within a minute of payment).
            </Typography>
          </Stack>
        ) : saleCanceled ? (
          <Alert severity="warning">
            This checkout payment was canceled. The sale cannot proceed on this authorization.
          </Alert>
        ) : !paymentAuthorized ? (
          <Stack spacing={2}>
            <Alert severity="warning">
              We do not have a completed checkout on file for this listing yet. Add a card in
              Wallet, then finish checkout.
            </Alert>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button variant="outlined" component={Link} href={walletHref}>
                Open Wallet
              </Button>
              <Button
                variant="contained"
                component={Link}
                href={`/checkout/${encodeURIComponent(listingId)}`}
              >
                Go to checkout
              </Button>
            </Stack>
          </Stack>
        ) : fundsCaptured ? (
          <Alert severity="success">
            {role === "seller"
              ? "Funds have been captured. The buyer can confirm receipt in step 3 whenever they are ready."
              : "Payment has been finalized and is on its way to the seller."}
          </Alert>
        ) : role === "buyer" ? (
          <Alert severity="success" variant="outlined">
            Payment authorized. Waiting for the seller to capture funds.
          </Alert>
        ) : (
          <Stack spacing={2}>
            <Alert severity="info">
              Buyer payment is authorized. Press Capture to secure funds in your account. Payment expires
              {captureDeadlineLabel ? (
                <>
                  {" "}
                  at: <b>{captureDeadlineLabel}</b>
                  {captureWindowExpired ? " (window may have passed. Capture can fail.)" : ""}
                </>
              ) : null}
            </Alert>
            {paymentActionError ? (
              <Alert severity="error" onClose={() => setPaymentActionError(null)}>
                {paymentActionError}
              </Alert>
            ) : null}
            {acceptPaymentMutation.isPending ? (
              <Alert severity="info" icon={false}>
                {recentCaptureAction === "cancel"
                  ? "Canceling authorization…"
                  : "Capturing payment…"}
              </Alert>
            ) : (
              <Stack direction="row" spacing={1.5} justifyContent="flex-end" flexWrap="wrap">
                <Button
                  onClick={() => acceptPaymentMutation.mutate("cancel")}
                  disabled={
                    acceptPaymentMutation.isPending ||
                    exchange.paymentStatus === "canceled" ||
                    exchange.paymentStatus === "succeeded"
                  }
                  color="error"
                  variant="text"
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Cancel authorization
                </Button>
                <Button
                  onClick={() => acceptPaymentMutation.mutate("capture")}
                  disabled={
                    acceptPaymentMutation.isPending ||
                    captureWindowExpired ||
                    exchange.paymentStatus === "canceled" ||
                    exchange.paymentStatus === "succeeded"
                  }
                  variant="contained"
                  color="success"
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Capture payment
                </Button>
              </Stack>
            )}
          </Stack>
        )}
      </Paper>

      {/* Step 2 — optional deliverables (never blocks confirmation) */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          2. Optional branding &amp; light documents
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload logos, NDAs, or short notes (max {MAX_BYTES / (1024 * 1024)} MB per file).
          This is optional and does not control when the buyer can confirm.
        </Typography>

        {role === "seller" && paymentAuthorized && !handoverDone && !saleCanceled ? (
          <>
            <input
              ref={fileRef}
              type="file"
              hidden
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain"
              onChange={handleFilesSelected}
            />
            <Button
              variant="contained"
              startIcon={<UploadFileRoundedIcon />}
              onClick={handlePickFiles}
              disabled={uploadMutation.isPending}
              sx={{ textTransform: "none", fontWeight: 700, mb: 2 }}
            >
              {uploadMutation.isPending ? "Uploading…" : "Upload files"}
            </Button>
          </>
        ) : role === "seller" && !paymentAuthorized ? (
          <Typography variant="body2" color="text.secondary">
            Complete checkout (step 1) before uploading optional files.
          </Typography>
        ) : role === "buyer" ? (
          <Typography variant="body2" color="text.secondary">
            The seller may upload supporting documents here. You do not need any uploads to
            confirm after they capture payment.
          </Typography>
        ) : null}

        {uploadError ? (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUploadError(null)}>
            {uploadError}
          </Alert>
        ) : null}

        {exchange.deliverables.length > 0 ? (
          <List dense disablePadding sx={{ mt: 1 }}>
            {exchange.deliverables.map((d: ListingExchangeDeliverable) => (
              <ListItem key={d.url} disablePadding sx={{ py: 0.25 }}>
                <ListItemButton
                  component="a"
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemText
                    primary={d.originalName || "File"}
                    secondary="Open in new tab"
                  />
                  <OpenInNewRoundedIcon fontSize="small" color="action" />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="caption" color="text.secondary">
            No files uploaded yet.
          </Typography>
        )}
      </Paper>

      {/* Step 3 — buyer confirmation (after capture only) */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          3. Buyer confirmation
        </Typography>
        {handoverDone ? (
          <Alert severity="success">The buyer confirmed receipt. This handover is closed.</Alert>
        ) : role === "buyer" ? (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              After the seller captures payment, confirm when you are satisfied with the
              handover (including anything transferred outside this room).
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover" }}>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
                Legal acknowledgment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                By confirming below, you acknowledge that this transaction is complete to your
                satisfaction based on what you received (including any assets or access shared
                outside this room). This confirmation is binding for marketplace purposes;
                separate legal rights may still apply where the law requires them.
              </Typography>
            </Paper>
            {confirmError ? (
              <Alert severity="error" onClose={() => setConfirmError(null)}>
                {confirmError}
              </Alert>
            ) : null}
            <Button
              variant="contained"
              color="success"
              disabled={
                !fundsCaptured ||
                saleCanceled ||
                confirmMutation.isPending
              }
              onClick={() => confirmMutation.mutate()}
              sx={{ textTransform: "none", fontWeight: 700, alignSelf: "flex-start" }}
            >
              {confirmMutation.isPending ? "Submitting…" : "I confirm receipt & transaction is complete"}
            </Button>
            {!fundsCaptured && !saleCanceled ? (
              <Typography variant="caption" color="text.secondary">
                This button enables after the seller captures the authorized payment.
              </Typography>
            ) : null}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Waiting for the buyer to confirm after you capture payment.
          </Typography>
        )}
      </Paper>

      {/* Step 4 — optional buyer review (persist on page; can return later) */}
      {handoverDone ? (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            4. Optional review
          </Typography>
          {role === "buyer" ? (
            buyerReviewSnapshot ? (
              <Stack spacing={1}>
                <Alert severity="success">
                  Thank you — your feedback was saved. You can revisit this page anytime; your
                  review will not change.
                </Alert>
                {buyerReviewSnapshot.rating != null ? (
                  <Typography variant="body2">
                    Stars: <b>{buyerReviewSnapshot.rating}</b> / 5
                  </Typography>
                ) : null}
                {buyerReviewSnapshot.comment ? (
                  <Typography variant="body2" color="text.secondary">
                    {buyerReviewSnapshot.comment}
                  </Typography>
                ) : null}
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  If you would like, rate this sale and the seller. This is optional and does not
                  change your confirmation.
                </Typography>
                <Divider />
                <Typography variant="subtitle2" fontWeight={700}>
                  How was your experience with the seller?
                </Typography>
                <FormControl size="small" sx={{ maxWidth: 360 }}>
                  <InputLabel id="exchange-review-stars">Star rating (0–5)</InputLabel>
                  <Select
                    labelId="exchange-review-stars"
                    label="Star rating (0–5)"
                    value={reviewStarChoice}
                    onChange={(e) => setReviewStarChoice(String(e.target.value))}
                  >
                    <MenuItem value="">
                      <em>No star rating (written feedback only)</em>
                    </MenuItem>
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <MenuItem key={n} value={String(n)}>
                        {n} / 5
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Written feedback (optional)"
                  placeholder="Anything the community or the seller should know?"
                  multiline
                  minRows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  inputProps={{ maxLength: 2000 }}
                  fullWidth
                />
                {reviewError ? (
                  <Alert severity="error" onClose={() => setReviewError(null)}>
                    {reviewError}
                  </Alert>
                ) : null}
                <Button
                  variant="contained"
                  disabled={
                    reviewMutation.isPending ||
                    (reviewStarChoice === "" && reviewComment.trim() === "")
                  }
                  onClick={() => reviewMutation.mutate()}
                  sx={{ textTransform: "none", fontWeight: 700, alignSelf: "flex-start" }}
                >
                  {reviewMutation.isPending ? "Submitting…" : "Submit review"}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  You need at least a star rating or a short note (or both). You can close this
                  page and come back whenever you are ready.
                </Typography>
              </Stack>
            )
          ) : (
            <Typography variant="body2" color="text.secondary">
              The buyer may leave an optional star rating and written feedback here after they
              confirm. Nothing in this step is required to close the sale.
            </Typography>
          )}
        </Paper>
      ) : null}
    </Container>
  );
}
