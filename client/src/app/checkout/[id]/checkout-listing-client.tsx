"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/auth-context";
import { useListings } from "@/hooks/use-listings";
import { useEscrow } from "@/hooks/use-escrow";
import { useStripeWallet } from "@/hooks/use-stripe-wallet";
import {
  isEscrowEligiblePrice,
  isEscrowRequiredPrice,
} from "@/lib/escrow-eligible";
import { TURNAROUND_OPTIONS } from "@/utils/listingOptions";
import { brandContainedButtonSx } from "@/theme/brand-palette";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  Alert,
  Box,
  Button,
  CardMedia,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  FormGroup,
  Modal,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

import type { Listing } from "../../../../types";
import StyledBoxContainer from "@/components/Shared/Modals/ModalStyles";

const PLACEHOLDER_COVER = "/placeholder-app-cover.svg";
const PENDING_AUCTION_BID_KEY = "weedies.pendingAuctionBid";

const HANDOVER_HELPER =
  "The estimated time the seller needs to hand over all relevant files, accounts, pages and branding items.";

const ESCROW_STARTED_MESSAGE =
  "Your Escrow checkout is started. Check your inbox for an email from Escrow.com to agree and pay. We will update your order when payment is received.";

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMoneyDetailed(amount: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function extractSeller(
  sellerId: Listing["sellerId"] | undefined,
): { id: string | null; display: string } {
  if (!sellerId) return { id: null, display: "Seller" };
  if (typeof sellerId === "string") {
    return { id: sellerId, display: "Seller" };
  }
  const s = sellerId as unknown as {
    _id?: string;
    name?: string;
    email?: string;
  };
  const id = s._id ? String(s._id) : null;
  if (s.name) return { id, display: s.name };
  if (s.email) return { id, display: s.email.split("@")[0] ?? "Seller" };
  return { id, display: "Seller" };
}

function coverUrl(listing: Listing | undefined): string {
  if (!listing?.photos?.length) return PLACEHOLDER_COVER;
  const idx = Math.min(
    Math.max(0, listing.coverIndex ?? 0),
    listing.photos.length - 1,
  );
  return listing.photos[idx] ?? PLACEHOLDER_COVER;
}

function listingProductPath(listing: Listing): string {
  const id = String(listing._id ?? "");
  const slug = listing.slug?.trim();
  if (id && slug) return `/products/${encodeURIComponent(id)}/${encodeURIComponent(slug)}`;
  if (id) return `/products/${encodeURIComponent(id)}`;
  return "/products";
}

export function CheckoutListingClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const listingId = decodeURIComponent(params?.id ?? "").trim();

  const { user, isLoggedIn, hydrated } = useAuth();
  const { getListing, placeAuctionBid } = useListings();
  const queryClient = useQueryClient();
  const { getPaymentMethods, createCheckoutSession } = useStripeWallet();
  const { initEscrowTransaction } = useEscrow();
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pendingYourBid, setPendingYourBid] = useState<number | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [escrowCheckoutStarted, setEscrowCheckoutStarted] = useState(false);
  const [escrowStartedMessage, setEscrowStartedMessage] = useState<string | null>(
    null,
  );
  const [openEscrowConfirm, setOpenEscrowConfirm] = useState(false);

  const escrowCheckoutLocked = escrowCheckoutStarted;

  const {
    data: listing,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => getListing(listingId),
    enabled: Boolean(listingId),
  });

  const stripeCustomerId = user?.stripeCustomerId?.trim() ?? "";
  const isAuctionListing = listing?.saleType === "auction";
  const isReservingBuyer = Boolean(
    listing?.status === "reserved" &&
      user?.id &&
      listing.buyerId &&
      String(listing.buyerId) === String(user.id),
  );
  const isAuctionWinnerCheckout = isAuctionListing && isReservingBuyer;
  const isAuctionBidFlow = isAuctionListing && !isAuctionWinnerCheckout;
  const checkoutAvailable = listing?.status === "live" || isReservingBuyer;

  const billingQueryEnabled =
    hydrated &&
    isLoggedIn &&
    Boolean(stripeCustomerId) &&
    (!isAuctionListing || isAuctionWinnerCheckout);

  const {
    data: paymentSnapshot,
    isLoading: billingLoading,
    isError: billingError,
  } = useQuery({
    queryKey: ["buyer-billing", stripeCustomerId],
    queryFn: () => getPaymentMethods(stripeCustomerId),
    enabled: billingQueryEnabled,
  });

  const hasDefaultPaymentMethod = Boolean(
    paymentSnapshot?.defaultPaymentMethodId &&
      String(paymentSnapshot.defaultPaymentMethodId).length > 0,
  );

  const defaultPaymentMethodSummary = useMemo(() => {
    const id = paymentSnapshot?.defaultPaymentMethodId;
    if (!id || !paymentSnapshot?.paymentMethods?.data?.length) return null;
    const pm = paymentSnapshot.paymentMethods.data.find((p) => p.id === id);
    if (!pm?.card) return "Default card on file";
    const brand = pm.card.brand ? String(pm.card.brand).toUpperCase() : "Card";
    return `${brand} ····${pm.card.last4}`;
  }, [paymentSnapshot]);

  const displayPrice = useMemo(() => {
    if (!listing) return 0;
    if (listing.saleType === "auction") {
      return Number(listing.auctionCurrentPrice ?? listing.startingPrice ?? 0);
    }
    return Number(listing.buyItNowPrice ?? listing.startingPrice ?? 0);
  }, [listing]);

  const currency = listing?.currency ?? "USD";
  const isEscrowEligible = isEscrowEligiblePrice(displayPrice);
  const isEscrowRequired = isEscrowRequiredPrice(displayPrice);

  const seller = extractSeller(listing?.sellerId);
  const isListingSeller = Boolean(
    user?.id && seller.id && String(user.id) === String(seller.id),
  );
  const walletHref =
    user?.id != null && String(user.id).length > 0
      ? `/my-settings/${user.id}/wallet`
      : "/signup";

  const turnaroundLabel =
    TURNAROUND_OPTIONS.find((t) => t.value === listing?.turnaround)?.label ??
    listing?.turnaround ??
    "Not specified";

  const messageHref = useMemo(() => {
    const q = new URLSearchParams();
    if (seller.id) q.set("sellerId", seller.id);
    if (listing?._id) q.set("listingId", String(listing._id));
    if (listing?.appName) q.set("subject", listing.appName);
    return `/messages${q.toString() ? `?${q}` : ""}`;
  }, [seller.id, listing?._id, listing?.appName]);

  const signInHref = `/signup?returnUrl=${encodeURIComponent(`/checkout/${listingId}`)}`;

  useEffect(() => {
    if (!listing?._id || typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(PENDING_AUCTION_BID_KEY);
      if (!raw) {
        setPendingYourBid(null);
        return;
      }
      const j = JSON.parse(raw) as { listingId?: string; amount?: unknown };
      if (String(j.listingId) !== String(listing._id)) {
        setPendingYourBid(null);
        return;
      }
      const n = typeof j.amount === "number" ? j.amount : Number(j.amount);
      setPendingYourBid(Number.isFinite(n) ? n : null);
    } catch {
      setPendingYourBid(null);
    }
  }, [listing?._id]);

  useEffect(() => {
    if (
      !listing ||
      listing.saleType === "auction" ||
      !isEscrowEligible ||
      !isReservingBuyer
    ) {
      return;
    }
    setEscrowCheckoutStarted(true);
    setEscrowStartedMessage((prev) => prev ?? ESCROW_STARTED_MESSAGE);
  }, [listing, isEscrowEligible, isReservingBuyer]);

  const handleAuctionBidSubmit = async () => {
    if (!acknowledged || !listing?._id || submitted || confirmSubmitting) return;
    if (listing.saleType !== "auction") return;
    if (pendingYourBid == null) {
      setConfirmError("Choose a bid amount from the listing page first, then return here.");
      return;
    }

    setConfirmError(null);
    setConfirmSubmitting(true);
    try {
      await placeAuctionBid(String(listing._id), pendingYourBid);
      try {
        sessionStorage.removeItem(PENDING_AUCTION_BID_KEY);
      } catch {
        // ignore
      }
      setPendingYourBid(null);
      await queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      await queryClient.invalidateQueries({ queryKey: ["my-auction-bids", user?.id] });
      setSubmitted(true);
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Could not place bid.");
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const handleStripeCheckout = async () => {
    if (!acknowledged || !listing?._id) return;
    if (listing.saleType === "auction" && !isAuctionWinnerCheckout) return;
    if (checkoutSubmitting || isEscrowRequired || escrowCheckoutLocked) return;
    setConfirmError(null);
    setCheckoutSubmitting(true);
    try {
      const url = await createCheckoutSession(String(listing._id));
      if (!url) throw new Error("Stripe did not return a checkout URL.");
      window.location.assign(url);
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Could not start checkout.");
      setCheckoutSubmitting(false);
    }
  };

  const handleEscrowCheckout = async () => {
    if (!acknowledged || !listing?._id || listing.saleType === "auction") return;
    if (!isEscrowEligible || checkoutSubmitting || escrowCheckoutLocked) return;
    setConfirmError(null);
    setOpenEscrowConfirm(false);
    setCheckoutSubmitting(true);
    try {
      const result = await initEscrowTransaction(String(listing._id));
      setEscrowCheckoutStarted(true);
      setEscrowStartedMessage(result.message || ESCROW_STARTED_MESSAGE);
      await queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      setCheckoutSubmitting(false);
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Could not start Escrow checkout.");
      setCheckoutSubmitting(false);
    }
  };

  const handleConfirmEscrowModal = () => {
    if (escrowCheckoutLocked) return;
    setOpenEscrowConfirm((prev) => !prev);
  };

  if (!listingId) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="warning">Missing listing.</Alert>
        <Button component={Link} href="/products" sx={{ mt: 2 }}>
          Back to marketplace
        </Button>
      </Container>
    );
  }

  if (!hydrated) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isLoggedIn) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="info">
          Sign in to continue to checkout. After you sign in you will return to this page.
        </Alert>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button component={Link} href={signInHref} variant="contained">
            Sign in
          </Button>
          <Button component={Link} href="/products" variant="outlined">
            Browse listings
          </Button>
        </Stack>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 12, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !listing) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">
          {error instanceof Error ? error.message : "Could not load this listing."}
        </Alert>
        <Button component={Link} href="/products" sx={{ mt: 2 }} variant="outlined">
          Back to marketplace
        </Button>
      </Container>
    );
  }

  if (
    (isAuctionWinnerCheckout || listing.saleType !== "auction") &&
    !stripeCustomerId &&
    !isEscrowEligible
  ) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="info">
          To pay for listings we need a Stripe billing profile on your account. Open Wallet once
          to add a card (you are not charged until you complete payment in Stripe Checkout).
        </Alert>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap">
          <Button component={Link} href={walletHref} variant="contained">
            Open Wallet
          </Button>
          <Button component={Link} href={listingProductPath(listing)} variant="outlined">
            Back to listing
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Modal
        open={openEscrowConfirm && !escrowCheckoutLocked}
        onClose={handleConfirmEscrowModal}
      >
        <StyledBoxContainer width="350px" height="auto" sx={{ p: 2 }}>
          <Stack direction="column" spacing={2}>
            <Typography variant="h6" textAlign="center" fontWeight={800} gutterBottom>
              Confirm Escrow Transaction
            </Typography>
          <Typography variant="subtitle2" color="text.secondary" textAlign="center" gutterBottom>
            You are about to initiate an Escrow transaction flow. This step does not require payment. Please confirm your intent to proceed.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={2}>
          <Button variant="text" color="error" onClick={handleConfirmEscrowModal}>
            cancel
          </Button>
          <Button
            endIcon={<CheckCircleIcon />}
            variant="contained"
            color="success"
            disabled={checkoutSubmitting || escrowCheckoutLocked}
            onClick={() => void handleEscrowCheckout()}
          >
            {checkoutSubmitting ? "Creating…" : "I confirm"}
          </Button>
          </Stack>
          </Stack>
        </StyledBoxContainer>
      </Modal>
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => router.push(listingProductPath(listing))}
        sx={{ mb: 2, textTransform: "none" }}
        color="inherit"
      >
        Back to listing
      </Button>

      <Typography variant="h4" fontWeight={800} gutterBottom>
        {isAuctionWinnerCheckout
          ? "Complete your purchase"
          : isAuctionListing
            ? "Bid confirmation"
            : "Checkout"}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {isAuctionWinnerCheckout
          ? "You won this auction. Complete Stripe Checkout to authorize payment, then continue in the Exchange room."
          : isAuctionListing
            ? pendingYourBid != null
              ? "Review your bid and the terms below. Your bid is recorded only after you confirm at the bottom of the page - no payment is taken for placing a bid."
              : "Review auction terms before you confirm. No payment is taken on this step."
            : "Review the listing and terms. Payment happens in Stripe Checkout; the charge is authorized first and only captured later so transfers stay under your control."}
      </Typography>

      {isEscrowEligible ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          This purchase is escrow eligible.
        </Alert>
      ) : null}

        {isAuctionListing && pendingYourBid != null ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Your intended bid is <b>{formatMoneyDetailed(pendingYourBid, currency)}</b>. Nothing is
          sent to Stripe until you confirm below (and bids still do not charge your card).
        </Alert>
      ) : null}

      {!isAuctionListing && !isEscrowRequired ? (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Stripe Checkout
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            All card entry and confirmation happen on Stripe&apos;s hosted page. We use{" "}
            <b>manual capture</b> (authorize now, capture later) so you can control settlement
            and Connect transfers.
          </Typography>
          {billingLoading ? (
            <Typography variant="body2" color="text.secondary">
              Loading your Wallet billing profile…
            </Typography>
          ) : billingError ? (
            <Alert severity="warning" sx={{ mb: 0 }}>
              Could not load saved cards. You can still pay in Checkout — open{" "}
              <Link href={walletHref}>Wallet</Link> to fix billing if needed.
            </Alert>
          ) : hasDefaultPaymentMethod && defaultPaymentMethodSummary ? (
            <Typography variant="body2" sx={{ mb: 0 }}>
              Wallet default card: <b>{defaultPaymentMethodSummary}</b> — Stripe may offer it in
              Checkout when it matches your customer profile.
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Add cards in <Link href={walletHref}>Wallet</Link> so they stay on your Stripe
              customer; Checkout is still the only place we take payment for this purchase.
            </Typography>
          )}
        </Paper>
      ) : null}

      {!isAuctionListing && isEscrowEligible ? (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Escrow.com checkout
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We create a protected Escrow transaction for this listing. You and the seller
            agree on Escrow.com, then you fund the purchase there. Funds are released after
            handover in the exchange room.
          </Typography>
        </Paper>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5}>
          <CardMedia
            component="img"
            src={coverUrl(listing)}
            alt={listing.appName}
            sx={{
              width: { xs: "100%", sm: 160 },
              height: 120,
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
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {listing.tagline}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Seller: <b>{seller.display}</b>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              {isAuctionListing ? "Current price" : "Price"}
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.25 }}>
              {formatMoney(displayPrice, currency)}
            </Typography>
            {isAuctionListing && pendingYourBid != null ? (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Your bid (review)
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.25 }}>
                  {formatMoneyDetailed(pendingYourBid, currency)}
                </Typography>
              </Box>
            ) : null}
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Estimated Handover Time
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {turnaroundLabel}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", lineHeight: 1.5 }}>
          {HANDOVER_HELPER}
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 2 }}>
          <InfoOutlinedIcon color="primary" sx={{ mt: 0.25 }} />
          <Typography variant="subtitle1" fontWeight={700}>
            {isAuctionListing ? "Before you bid" : "Before you pay"}
          </Typography>
        </Stack>
        {isAuctionListing ? (
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Sellers have the right to refuse bids.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              If your bid is not accepted within three (3) days, it will automatically void.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              If you are the winning bidder, you are legally bound to complete this purchase.
              Failure to do so may result in account suspension or a permanent ban from the platform. This does not include any potential action the user may seek to take against you.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              It is important to speak with the seller before you bid. Use{" "}
              <b>Message seller</b> if you still have questions.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              If you confrim your bid and as a result, win the auction. You are liable for potential cancellation fee not exceeding 10% of the bid amount in the event where you A. Decide to cancel within the seller&apos;s grace handoff period or B. Fail to make payment altogether.
             
            </Typography>
          </Box>
        ) : (
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              The seller has the right to refuse this purchase and cancel the transaction before
              handover is complete.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              If the seller does not respond within three (3) business days, the sale will
              automatically be voided and your full payment will be refunded.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              It is important to speak with the seller before you buy. Use{" "}
              <b>Message seller</b> if you still have questions.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              If you complete payment and cancel within the seller&apos;s grace handoff period, you may
              be charged a flat fee of 10% of the purchase price.{" "}
              <b>Pending investigation.</b>
            </Typography>
          </Box>
        )}
        <Divider sx={{ my: 2 }} />
        {isListingSeller ? (
          <Tooltip title="You cannot message yourself.">
            <Box component="span" sx={{ display: "inline-block" }}>
              <Button
                variant="outlined"
                startIcon={<ChatRoundedIcon />}
                disabled
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Message seller
              </Button>
            </Box>
          </Tooltip>
        ) : (
          <Button
            component={Link}
            href={messageHref}
            variant="outlined"
            startIcon={<ChatRoundedIcon />}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Message seller
          </Button>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={acknowledged}
                onChange={(_, v) => setAcknowledged(v)}
                disabled={submitted || confirmSubmitting || escrowCheckoutLocked}
              />
            }
            label={
              isAuctionListing
                ? "I have read and understand the bid terms above."
                : "I have read and understand the terms above."
            }
          />
        </FormGroup>
      </Paper>

      {confirmError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setConfirmError(null)}>
          {confirmError}
        </Alert>
      ) : null}

      {escrowStartedMessage ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {escrowStartedMessage}
        </Alert>
      ) : null}

      {isAuctionWinnerCheckout ? (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
          <Button
            variant="contained"
            size="large"
            disabled={
              !acknowledged ||
              checkoutSubmitting ||
              !checkoutAvailable ||
              escrowCheckoutLocked
            }
            onClick={() => void handleStripeCheckout()}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              px: 3,
              ...brandContainedButtonSx,
              boxShadow: "none",
            }}
          >
            {checkoutSubmitting ? "Redirecting to Stripe…" : "Continue to Stripe Checkout"}
          </Button>
        </Stack>
      ) : isAuctionBidFlow ? (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <Button
            variant="contained"
            size="large"
            disabled={!acknowledged || submitted || confirmSubmitting}
            onClick={() => void handleAuctionBidSubmit()}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              px: 3,
              ...brandContainedButtonSx,
              boxShadow: "none",
            }}
          >
            {submitted
              ? "Bid recorded"
              : confirmSubmitting
                ? "Placing bid…"
                : "Confirm bid and notify seller"}
          </Button>
        </Stack>
      ) : (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
          {!isEscrowRequired ? (
            <Button
              variant="contained"
              size="large"
              disabled={
                !acknowledged ||
                checkoutSubmitting ||
                !checkoutAvailable ||
                escrowCheckoutLocked
              }
              onClick={() => void handleStripeCheckout()}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
                ...brandContainedButtonSx,
                boxShadow: "none",
              }}
            >
              {checkoutSubmitting ? "Redirecting to Stripe…" : "Continue to Stripe Checkout"}
            </Button>
          ) : null}
          {isEscrowEligible ? (
            <Button
              startIcon={<AccountBalanceIcon />}
              variant="contained"
              size="large"
              disabled={
                !acknowledged ||
                checkoutSubmitting ||
                !checkoutAvailable ||
                escrowCheckoutLocked
              }
              onClick={handleConfirmEscrowModal}
              color="success"
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
              }}
            >
              {escrowCheckoutLocked
                ? "Escrow started"
                : checkoutSubmitting
                  ? "Creating Transaction…"
                  : "Start Escrow Processing"}
            </Button>
          ) : null}
        </Stack>
      )}

      {submitted && isAuctionListing ? (
        <Alert severity="success" sx={{ mt: 3 }}>
          Your bid was recorded. <b>No payment is taken</b> when you bid; the seller will accept
          or decline your offer.
        </Alert>
      ) : null}
    </Container>
  );
}
