"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AuctionBidModal } from "@/components/Auction/AuctionBidModal";
import { ListingGaMetricsPanel } from "@/components/Analytics/ListingGaMetricsPanel";
import { ListingRevenueCatMetricsPanel } from "@/components/Analytics/ListingRevenueCatMetricsPanel";
import { DeleteListingConfirmModal } from "@/components/Listings/DeleteListingConfirmModal";
import { PrivateAccessRequestsModal } from "@/components/Listings/PrivateAccessRequestsModal";
import { ListingReviewsPanel } from "@/components/Reviews/ListingReviewsPanel";
import { useAuth } from "@/context/auth-context";
import { mongoIdString } from "@/utils/mongo-id";
import { useListings } from "@/hooks/use-listings";
import { useStripeWallet } from "@/hooks/use-stripe-wallet";
import {
  DIFFICULTY_OPTIONS,
  TURNAROUND_OPTIONS,
  getCategoryLabel,
} from "@/utils/listingOptions";

import VerifiedIcon from '@mui/icons-material/Verified';
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PaymentRoundedIcon from "@mui/icons-material/PaymentRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import { SecureCheckoutNote } from "@/components/Checkout/SecureCheckoutNote";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Rating,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import useMediaQuery from "@mui/material/useMediaQuery";
import useTheme from "@mui/material/styles/useTheme";

import { AppDescriptionHtml } from "@/components/Listings/AppDescriptionHtml";
import { ListingPlatformsRow } from "@/components/Listings/ListingPlatformsRow";
import { ListingSocialMediaRow } from "@/components/Listings/ListingSocialMediaRow";
import { brandContainedButtonSx } from "@/theme/brand-palette";
import type { Listing, ListingSellerPublic, ListingSellerRef } from "../../../types";
import {
  auctionBuyItNowPriceDollars,
  hasAuctionBuyItNow,
} from "@/lib/auction-buy-it-now";
import { countPendingPrivateAccessRequests } from "@/utils/private-listing-access";
import { trackRedditAddToCart } from "@/lib/reddit-pixel";
const PLACEHOLDER_COVER = "/placeholder-app-cover.svg";
const PENDING_AUCTION_BID_KEY = "weedies.pendingAuctionBid";

export type ProductDetailsClientProps = {
  /** `GET /listings/:id` (Mongo ObjectId or legacy slug). */
  fetchBy: string;
};

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
}

function isPopulatedListingSeller(
  sellerId: ListingSellerRef | undefined,
): sellerId is ListingSellerPublic {
  return typeof sellerId === "object" && sellerId !== null && "_id" in sellerId;
}

function developerAccountTransferModalCopy(
  platforms: string[] | undefined,
): { title: string; body: string } {
  const ios = platforms?.includes("ios");
  const android = platforms?.includes("android");
  if (ios && android) {
    return {
      title: "Apple & Google developer accounts",
      body:
        "In order to transfer this app, you will need to already have or create an Apple Developer account and a Google Play Developer account.",
    };
  }
  if (ios) {
    return {
      title: "Apple Developer account",
      body:
        "In order to transfer this app, you will need to already have or create an Apple Developer account.",
    };
  }
  return {
    title: "Google Play Developer account",
    body:
      "In order to transfer this app, you will need to already have or create a Google Play Developer account.",
  };
}

function extractSeller(sellerId: ListingSellerRef | undefined): {
  id: string | null;
  display: string;
  sellerRating: number;
  totalSellerReviews: number;
  totalListingsSold: number;
} {
  if (!sellerId) {
    return {
      id: null,
      display: "Seller",
      sellerRating: 0,
      totalSellerReviews: 0,
      totalListingsSold: 0,
    };
  }
  if (typeof sellerId === "string") {
    const id = sellerId.trim() || null;
    return {
      id,
      display: "Seller",
      sellerRating: 0,
      totalSellerReviews: 0,
      totalListingsSold: 0,
    };
  }
  const id = mongoIdString(sellerId._id) || null;
  const display = sellerId.name
    ? sellerId.name
    : sellerId.email
      ? sellerId.email.split("@")[0] ?? "Seller"
      : "Seller";
  return {
    id,
    display,
    sellerRating: Number(sellerId.sellerRating ?? 0),
    totalSellerReviews: Number(sellerId.totalSellerReviews ?? 0),
    totalListingsSold: Number(sellerId.totalListingsSold ?? 0),
  };
}

function coverUrl(listing: Listing | undefined): string {
  if (!listing?.photos?.length) return PLACEHOLDER_COVER;
  const idx = Math.min(
    Math.max(0, listing.coverIndex ?? 0),
    listing.photos.length - 1,
  );
  return listing.photos[idx] ?? PLACEHOLDER_COVER;
}

function useCountdown(target: Date | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [target]);

  return useMemo(() => {
    if (!target) return { label: "No end date", ended: true };
    const ms = target.getTime() - now;
    if (ms <= 0) return { label: "Ended", ended: true };
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / 60000) % 60;
    const h = Math.floor(ms / 3600000) % 24;
    const d = Math.floor(ms / 86400000);
    const parts = [];
    if (d) parts.push(`${d}d`);
    parts.push(`${h}h`, `${String(m).padStart(2, "0")}m`, `${String(s).padStart(2, "0")}s`);
    return { label: parts.join(" "), ended: false };
  }, [target, now]);
}

export function ProductDetailsClient({ fetchBy }: ProductDetailsClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoggedIn, hydrated } = useAuth();
  const {
    getListing,
    getSellerListingEditMeta,
    deleteListing,
    setAuctionBidStatus,
    requestPrivateListingAccess,
    resolvePrivateListingAccess,
  } = useListings();
  const { getPaymentMethods } = useStripeWallet();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const {
    data: listing,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["listing", fetchBy, user?.id ?? ""],
    queryFn: () => getListing(fetchBy),
    enabled: Boolean(fetchBy),
  });

  const acceptedBidHistory = listing?.auctionAcceptedBidHistory ?? [];
  const pendingBidsHistory =
    listing?.auctionBids?.filter((bid) => bid.bidStatus === "pending") ?? [];

  const listingSellerId = mongoIdString(listing?.sellerId);
  const isListingOwner = Boolean(
    hydrated &&
      isLoggedIn &&
      listingSellerId &&
      mongoIdString(user?.id) === listingSellerId,
  );
  const stripeCustomerId = user?.stripeCustomerId?.trim() ?? "";
  const isAuction = listing?.saleType === "auction";
  const billingQueryEnabled =
    hydrated &&
    isLoggedIn &&
    Boolean(stripeCustomerId) &&
    !isAuction;

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

  const messageSellerDisabled =
    !hydrated ||
    !isLoggedIn ||
    isListingOwner ||
    (listing?.isPrivateListing && listing?.privateAccess?.canView === false);

  const walletHref =
    user?.id != null && String(user.id).length > 0
      ? `/my-settings/${user.id}/wallet`
      : "/signup";

  const [hero, setHero] = useState<string>(PLACEHOLDER_COVER);
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [deleteListingOpen, setDeleteListingOpen] = useState(false);
  const [deleteListingLoading, setDeleteListingLoading] = useState(false);
  const [deleteListingError, setDeleteListingError] = useState<string | null>(null);
  const [privateAccessDialogOpen, setPrivateAccessDialogOpen] = useState(false);
  const [privateAccessNote, setPrivateAccessNote] = useState("");
  const [privateAccessSellerModalOpen, setPrivateAccessSellerModalOpen] =
    useState(false);
  const [developerAccountsModalOpen, setDeveloperAccountsModalOpen] =
    useState(false);
  const [privateAccessResolveKey, setPrivateAccessResolveKey] = useState<
    string | null
  >(null);

  const bidActionMutation = useMutation({
    mutationFn: async (vars: { bidId: string; status: "accepted" | "rejected" }) => {
      if (!listing?._id) throw new Error("Missing listing");
      return setAuctionBidStatus(String(listing._id), vars.bidId, vars.status);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["listing", fetchBy] }),
        queryClient.invalidateQueries({ queryKey: ["my-listings"] }),
        queryClient.invalidateQueries({ queryKey: ["my-auction-bids"] }),
      ]);
    },
  });

  const privateAccessMutation = useMutation({
    mutationFn: async (message?: string) => {
      if (!listing?._id) throw new Error("Missing listing");
      const trimmed = message?.trim();
      return requestPrivateListingAccess(
        String(listing._id),
        trimmed ? { message: trimmed } : undefined,
      );
    },
    onSuccess: async () => {
      setPrivateAccessDialogOpen(false);
      setPrivateAccessNote("");
      await queryClient.invalidateQueries({ queryKey: ["listing", fetchBy] });
    },
  });

  useEffect(() => {
    if (listing) setHero(coverUrl(listing));
  }, [listing]);

  const seller = extractSeller(listing?.sellerId);
  const sellerInitial = (seller.display || "?").charAt(0).toUpperCase();
  const listingMongoId = listing?._id ? String(listing._id) : "";
  const isOwner = Boolean(
    user?.id && seller.id && String(user.id) === String(seller.id),
  );
  const pendingPrivateAccessCount = countPendingPrivateAccessRequests(listing);

  const handleResolvePrivateAccessOnListingPage = async (
    listingId: string,
    requestId: string,
    decision: "approve" | "deny",
  ) => {
    if (!listingId || !requestId || privateAccessResolveKey) return;
    setPrivateAccessResolveKey(`${listingId}:${requestId}`);
    try {
      await resolvePrivateListingAccess(listingId, requestId, decision);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["listing", fetchBy] }),
        queryClient.invalidateQueries({ queryKey: ["my-listings"] }),
      ]);
    } finally {
      setPrivateAccessResolveKey(null);
    }
  };

  const auctionBuyItNowPrice =
    listing && isAuction ? auctionBuyItNowPriceDollars(listing) : null;
  const showAuctionBuyItNow = Boolean(listing && isAuction && hasAuctionBuyItNow(listing));

  const buyItNowDisabled =
    !hydrated ||
    !isLoggedIn ||
    isAuction ||
    !listing ||
    listing.status !== "live" ||
    isListingOwner ||
    (listing.isPrivateListing && listing.privateAccess?.canView === false);

  const buyTooltip = useMemo(() => {
    if (!hydrated) return "One moment…";
    if (!isLoggedIn) return "Sign in to buy.";
    if (listing?.isPrivateListing && listing?.privateAccess?.canView === false) {
      return "Request access from the seller first.";
    }
    if (isAuction) return "This listing is an auction. Use Place bid.";
    if (listing?.status === "reserved") {
      return "A buyer is completing checkout for this listing.";
    }
    if (!listing || listing.status !== "live") return "This listing is not available to buy.";
    if (isListingOwner) return "You can't purchase your own listing.";
    return "";
  }, [hydrated, isLoggedIn, isAuction, listing, isListingOwner]);

  const { data: editMeta, isLoading: editMetaLoading } = useQuery({
    queryKey: ["listing-edit-meta", listingMongoId],
    queryFn: () => getSellerListingEditMeta(listingMongoId),
    enabled: Boolean(
      hydrated && isLoggedIn && isOwner && listingMongoId.length > 0,
    ),
  });

  const handleConfirmDeleteListingFromProductPage = async () => {
    if (!listingMongoId) return;
    setDeleteListingLoading(true);
    setDeleteListingError(null);
    try {
      await deleteListing(listingMongoId);
      setDeleteListingOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["listing", fetchBy] });
      await queryClient.invalidateQueries({ queryKey: ["my-listings", user?.id] });
      const settingsId = user?.id != null ? String(user.id) : "";
      router.push(
        settingsId
          ? `/my-settings/${encodeURIComponent(settingsId)}`
          : "/products",
      );
    } catch (e) {
      setDeleteListingError(
        e instanceof Error ? e.message : "Could not remove listing.",
      );
    } finally {
      setDeleteListingLoading(false);
    }
  };

  const currency = listing?.currency ?? "USD";
  const buyPrice = isAuction
    ? Number(listing?.startingPrice ?? 0)
    : Number(listing?.buyItNowPrice ?? listing?.startingPrice ?? 0);

  const auctionEnd = useMemo(() => {
    if (!listing?.auctionEndDate) return null;
    return new Date(listing.auctionEndDate);
  }, [listing?.auctionEndDate]);

  const countdown = useCountdown(auctionEnd);

  const auctionBuyItNowDisabled =
    !hydrated ||
    !isLoggedIn ||
    !showAuctionBuyItNow ||
    countdown.ended ||
    !listing ||
    listing.status !== "live" ||
    isListingOwner ||
    (listing.isPrivateListing && listing.privateAccess?.canView === false);

  const auctionBuyItNowTooltip = useMemo(() => {
    if (!hydrated) return "One moment…";
    if (!isLoggedIn) return "Sign in to buy it now.";
    if (isListingOwner) return "You can't purchase your own listing.";
    if (countdown.ended) return "This auction has ended.";
    if (listing?.status !== "live") return "This listing is not available to buy.";
    if (listing?.isPrivateListing && listing?.privateAccess?.canView === false) {
      return "Request access from the seller first.";
    }
    return "";
  }, [hydrated, isLoggedIn, isListingOwner, countdown.ended, listing]);

  const placeBidDisabled =
    !hydrated ||
    !isLoggedIn ||
    countdown.ended ||
    isListingOwner ||
    (listing?.isPrivateListing && listing?.privateAccess?.canView === false);

  const bidTooltip = useMemo(() => {
    if (listing?.saleType === "auction" && countdown.ended) {
      return "This auction has ended.";
    }
    if (!hydrated) return "";
    if (!isLoggedIn) return "Sign in to place a bid.";
    if (isListingOwner) return "You can't bid on your own listing.";
    if (listing?.isPrivateListing && listing?.privateAccess?.canView === false) {
      return "Request access from the seller first.";
    }
    return "";
  }, [listing, countdown.ended, hydrated, isLoggedIn, isListingOwner]);

  const handleBuyItNow = () => {
    if (!listing?._id || buyItNowDisabled || isAuction) return;
    trackRedditAddToCart({
      listingId: String(listing._id),
      name: listing.appName,
      category: listing.category,
      value: buyPrice,
      currency,
    });
    router.push(`/checkout/${encodeURIComponent(String(listing._id))}`);
  };

  const handleAuctionBuyItNow = () => {
    if (!listing?._id || auctionBuyItNowDisabled) return;
    trackRedditAddToCart({
      listingId: String(listing._id),
      name: listing.appName,
      category: listing.category,
      value: buyPrice,
      currency,
    });
    router.push(
      `/checkout/${encodeURIComponent(String(listing._id))}?purchase=buy-it-now`,
    );
  };

  const handlePlaceBid = () => {
    if (!listing?._id || placeBidDisabled || !isAuction || isListingOwner) return;
    setBidModalOpen(true);
  };

  const handleMessageSeller = () => {
    if (!hydrated || !isLoggedIn || isListingOwner) return;
    const q = new URLSearchParams();
    if (seller.id) q.set("sellerId", seller.id);
    if (listing?._id) q.set("listingId", String(listing._id));
    if (listing?.appName) q.set("subject", listing.appName);
    router.push(`/messages${q.toString() ? `?${q}` : ""}`);
  };

  const handleRequestPrivateAccess = () => {
    if (!hydrated || !isLoggedIn) {
      router.push("/signup");
      return;
    }
    setPrivateAccessDialogOpen(true);
  };

  const handleSubmitPrivateAccessRequest = async () => {
    await privateAccessMutation.mutateAsync(privateAccessNote);
  };

  if (!fetchBy) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="warning">Missing listing path.</Alert>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 10, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !listing) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="error">
          {error instanceof Error ? error.message : "Could not load this listing."}
        </Alert>
        <Button component={Link} href="/products" sx={{ mt: 2 }} variant="outlined">
          Back to marketplace
        </Button>
      </Container>
    );
  }

  const populatedSeller = isPopulatedListingSeller(listing.sellerId)
    ? listing.sellerId
    : null;
  const verifiedCreator = Boolean(populatedSeller?.isVerifiedCreator);
  const verifiedOwnership = Boolean(listing.ownershipVerification?.isVerified);

  const messageSellerTooltip = !hydrated
    ? "One moment…"
    : isListingOwner
      ? "You cannot message yourself."
      : !isLoggedIn
        ? "Sign in to message the seller."
        : listing.isPrivateListing && listing.privateAccess?.canView === false
          ? "Request access first."
          : "";

  const buyerIdStr = listing.buyerId ? String(listing.buyerId) : "";
  const isPurchasingBuyer = Boolean(
    hydrated && isLoggedIn && user?.id && buyerIdStr && String(user.id) === buyerIdStr,
  );
  const privateRequestStatus = listing.privateAccess?.status ?? "none";
  const isPrivateRestricted = Boolean(
    listing.isPrivateListing && listing.privateAccess?.canView === false,
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="column" spacing={3}>
        {isOwner &&
        listing.isPrivateListing &&
        pendingPrivateAccessCount > 0 ? (
          <Alert
            severity="warning"
            icon={<LockRoundedIcon fontSize="inherit" />}
            action={
              <Button
                color="inherit"
                size="small"
                sx={{ fontWeight: 800 }}
                onClick={() => setPrivateAccessSellerModalOpen(true)}
              >
                Review requests
              </Button>
            }
            sx={{ borderRadius: 2 }}
          >
            {pendingPrivateAccessCount} private access request
            {pendingPrivateAccessCount === 1 ? "" : "s"} waiting for your approval.
          </Alert>
        ) : null}

        {listing.status === "reserved" &&
        hydrated &&
        isLoggedIn &&
        isPurchasingBuyer ? (
          <Alert
            severity="warning"
            action={
              <Button
                component={Link}
                href={`/checkout/${encodeURIComponent(listingMongoId)}`}
                color="inherit"
                size="small"
                sx={{ fontWeight: 700 }}
              >
                Complete checkout
              </Button>
            }
          >
            You won this auction
            {listing.auctionWinningAmount != null
              ? ` for $${Number(listing.auctionWinningAmount).toLocaleString()}`
              : ""}
            . Complete Stripe Checkout to secure the sale, then continue in the success room.
          </Alert>
        ) : null}

        {listing.status === "sold" &&
        hydrated &&
        isLoggedIn &&
        (isOwner || isPurchasingBuyer) ? (
          <Alert
            severity="success"
            action={
              <Button
                component={Link}
                href={`/exchange/${encodeURIComponent(listingMongoId)}`}
                color="inherit"
                size="small"
                sx={{ fontWeight: 700 }}
              >
                Success room
              </Button>
            }
          >
            This listing is sold. Open the success room to track payment status, upload
            branding or light documents, and complete buyer confirmation.
          </Alert>
        ) : null}

        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Chip
            label={getCategoryLabel(listing.category)}
            size="small"
            color="secondary"
            sx={{ fontWeight: 700 }}
          />
          {isAuction ? (
            <Chip
              size="small"
              variant="outlined"
              color="warning"
              icon={<GavelRoundedIcon sx={{ fontSize: 14 }} />}
              label="Auction"
            />
          ) : (
            <Chip size="small" variant="outlined" label="Buy it now" />
          )}
          
        </Stack>

        <Stack spacing={1}>
          <Typography variant="h3" fontWeight={900} sx={{ lineHeight: 1.1 }}>
            {isPrivateRestricted ? "Private listing" : listing.appName}
          </Typography>
          <Typography variant="h6" color="text.secondary" fontWeight={500}>
            {isPrivateRestricted
              ? "Request access to unlock full listing details."
              : listing.tagline}
          </Typography>
          {listing.monthlyRevenue != null ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {formatMoney(listing.monthlyRevenue, currency)}/mo reported revenue
            </Typography>
          ) : null}
         
          <Stack spacing={1.25} sx={{ mt: 0.5 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
            >
              <Avatar sx={{ width: 28, height: 28, bgcolor: "secondary.main", fontSize: 13 }}>
                {isPrivateRestricted ? <LockRoundedIcon sx={{ fontSize: 14 }} /> : sellerInitial}
              </Avatar>
              <Typography variant="body2" sx={{ minWidth: 0 }}>
                by <b>{isPrivateRestricted ? "Private seller" : seller.display}</b>
              </Typography>
              {isPrivateRestricted ? (
                <Chip size="small" label="Private" color="warning" variant="outlined" />
              ) : null}
              {!isPrivateRestricted && verifiedCreator ? (
                <Chip
                  size="small"
                  icon={<VerifiedRoundedIcon sx={{ fontSize: 14 }} />}
                  label="Verified creator"
                  color="success"
                  variant="outlined"
                />
              ) : null}
            </Stack>

            {!isPrivateRestricted ? (
              (() => {
                const listingReviews = Number(listing.totalReviews ?? 0);
                const listingRating = Number(listing.averageRating ?? 0);
                const useSellerRollup =
                  listingReviews === 0 && seller.totalSellerReviews > 0;
                const rating = useSellerRollup
                  ? seller.sellerRating
                  : listingRating;
                const reviewLabel = useSellerRollup
                  ? `${seller.totalSellerReviews.toLocaleString()} seller review${seller.totalSellerReviews === 1 ? "" : "s"}`
                  : `${listingReviews.toLocaleString()} review${listingReviews === 1 ? "" : "s"}`;
                return (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={{ xs: 0.5, sm: 1.5 }}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    {typeof listing.views === "number" ? (
                      <Typography variant="caption" color="text.secondary">
                        {listing.views.toLocaleString()} views
                      </Typography>
                    ) : null}
                    <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
                      <Rating
                        readOnly
                        size="small"
                        precision={0.1}
                        value={Math.min(5, Math.max(0, rating))}
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                        {rating.toFixed(1)} · {reviewLabel}
                      </Typography>
                    </Stack>
                  </Stack>
                );
              })()
            ) : (
              <Chip size="small" label="Private details hidden" variant="outlined" />
            )}
          </Stack>
        </Stack>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }} sx={{ order: { xs: 2, md: 1 } }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 4,
                p: { xs: 2.5, md: 3 },
                height: "100%",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Stack spacing={2.5}>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "start",  }}>
                  <Tooltip title={`Verified on ${String(new Date(listing.ownershipVerification?.dateVerified ?? "").toLocaleDateString())}`} arrow placement="top">
                    <Box>
                      {verifiedOwnership ? <Alert icon={<VerifiedIcon sx={{ fontSize: 16 }} />} severity="success"  sx={{ padding: "0rem 1rem", fontSize: 12}}>
                        Seller ownership verified
                      </Alert>:null}
                    </Box>
                  </Tooltip>
                  </Box>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    About
                  </Typography>
                  {isPrivateRestricted ? (
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      This listing is private. After seller approval you can view
                      the app name, screenshots, links, and full handover details.
                    </Typography>
                  ) : (
                    <AppDescriptionHtml
                      html={listing.appDescription ?? ""}
                      scrollable
                    />
                  )}
                </Box>

                <Divider />

                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    Details
                  </Typography>

                  {!isPrivateRestricted &&
                  listing?.platforms &&
                  (listing.platforms.includes("ios") ||
                    listing.platforms.includes("android")) ? (
                    <Alert
                      icon={false}
                      severity="info"
                      sx={{ fontSize: 12, mt: 0.5, mb: 0.5 }}
                      action={
                        <Chip
                          clickable
                          size="small"
                          label="Learn more"
                          variant="outlined"
                          color="info"
                          onClick={() => setDeveloperAccountsModalOpen(true)}
                        />
                      }
                    >
                      {listing.platforms.includes("ios") &&
                        !listing.platforms.includes("android") &&
                        "iOS apps require an Apple Developer account."}
                      {listing.platforms.includes("android") &&
                        !listing.platforms.includes("ios") &&
                        "Android apps require a Google Play Developer account."}
                      {listing.platforms.includes("ios") &&
                        listing.platforms.includes("android") &&
                        "iOS and Android apps require Apple and Google Play Developer accounts."}
                    </Alert>
                  ) : null}

                  {!isPrivateRestricted &&
          listing.platforms &&
          listing.platforms.length > 0 ? (
            <ListingPlatformsRow
              platforms={listing.platforms}
              platformUrls={listing.platformUrls}
              linkable
              size="detail"
              sx={{ mt: 0.5 }}
            />
          ) : null}
                  {!isPrivateRestricted ? (
                    <ListingSocialMediaRow
                      socialMedia={listing.socialMedia}
                      socialMediaUrls={listing.socialMediaUrls}
                      linkable
                      size="detail"
                      sx={{ mt: 1 }}
                    />
                  ) : null}
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    <Box>
                      <Typography variant="body2" component="div" fontWeight={700}>
                        Difficulty
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {DIFFICULTY_OPTIONS.find((d) => d.value === listing.difficulty)?.label ??
                          listing.difficulty}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" component="div" fontWeight={700}>
                        Estimated Handover Time
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {TURNAROUND_OPTIONS.find((t) => t.value === listing.turnaround)?.label ??
                          listing.turnaround}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block", lineHeight: 1.45 }}>
                        The estimated time the seller needs to hand over all relevant files, accounts,
                        pages and branding items
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" component="div" fontWeight={700}>
                        Business age
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {listing.ageOfBusinessMonths} months
                      </Typography>
                    </Box>
                    {listing.monthlyRevenue != null ? (
                      <Box>
                        <Typography variant="body2" component="div" fontWeight={700}>
                          Monthly revenue (reported)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          {formatMoney(listing.monthlyRevenue, currency)}
                        </Typography>
                      </Box>
                    ) : null}
                    {listing.monthlyActiveUsers != null ? (
                      <Box>
                        <Typography variant="body2" component="div" fontWeight={700}>
                          Monthly active users (reported)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          {listing.monthlyActiveUsers.toLocaleString()}
                        </Typography>
                      </Box>
                    ) : null}
                    {!isPrivateRestricted &&
                    (listing.googleAnalyticsPropertyDisplayName ||
                      listing.revenueCatProjectDisplayName) && (
                      <Box>
                        <Typography variant="body2" component="div" fontWeight={700}>
                          Linked metrics accounts
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.75 }}>
                          {listing.googleAnalyticsPropertyDisplayName ? (
                            <Chip
                              size="small"
                              avatar={<Avatar src="/google-g.svg" alt="" />}
                              label={`Google Analytics · ${listing.googleAnalyticsPropertyDisplayName}`}
                              variant="outlined"
                            />
                          ) : null}
                          {listing.revenueCatProjectDisplayName ? (
                            <Chip
                              icon={<Avatar src="/logo-rc-small.svg" sx={{ backgroundColor: "transparent", width: 20, height: 20, borderRadius: "0px" }} alt="" />}
                              size="small"
                              label={`RevenueCat · ${listing.revenueCatProjectDisplayName}`}
                              variant="outlined"
                              sx={{ padding: 1}}
                            />
                          ) : null}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block", lineHeight: 1.45 }}>
                          Shown when the seller connects verification; property names come from
                          the verify step after OAuth.
                        </Typography>
                      </Box>
                    )}
                    {!isPrivateRestricted &&
                    listing.googleAnalyticsPropertyResourceName &&
                    listingMongoId ? (
                      <>
                        <Divider sx={{ my: 1 }} />
                        <ListingGaMetricsPanel
                          listingId={listingMongoId}
                          title="Verified traffic (last 30 days)"
                          isListingOwner={isOwner}
                          reconnectHref={
                            isOwner
                              ? `/products/verify?listingId=${encodeURIComponent(listingMongoId)}`
                              : undefined
                          }
                        />
                      </>
                    ) : null}
                    {!isPrivateRestricted &&
                    listing.revenueCatProjectId &&
                    listingMongoId ? (
                      <>
                        <Divider sx={{ my: 1 }} />
                        <ListingRevenueCatMetricsPanel
                          listingId={listingMongoId}
                          isListingOwner={isOwner}
                          reconnectHref={
                            isOwner
                              ? `/products/verify?listingId=${encodeURIComponent(listingMongoId)}`
                              : undefined
                          }
                        />
                      </>
                    ) : null}
                  </Stack>
                </Box>

                {!isPrivateRestricted && listing.techStack && listing.techStack.length > 0 ? (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="overline" color="text.secondary" fontWeight={700}>
                        Tech stack
                      </Typography>
                      <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1 }}>
                        {listing.techStack.map((t) => (
                          <Chip key={t} size="small" label={t} variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  </>
                ) : null}

                {!isPrivateRestricted && listing.tags && listing.tags.length > 0 ? (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="overline" color="text.secondary" fontWeight={700}>
                        Tags
                      </Typography>
                      <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1 }}>
                        {listing.tags.map((t) => (
                          <Chip key={t} size="small" label={t} color="primary" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  </>
                ) : null}

                {!isPrivateRestricted &&
                (listing.demoUrl || listing.repoUrl || listing.liveUrl) && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="overline" color="text.secondary" fontWeight={700}>
                        Links
                      </Typography>
                      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                        {listing.demoUrl ? (
                          <Button
                            size="small"
                            variant="outlined"
                            endIcon={<OpenInNewRoundedIcon />}
                            href={listing.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            component="a"
                          >
                            Demo
                          </Button>
                        ) : null}
                        {listing.repoUrl ? (
                          <Button
                            size="small"
                            variant="outlined"
                            endIcon={<OpenInNewRoundedIcon />}
                            href={listing.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            component="a"
                          >
                            Repo
                          </Button>
                        ) : null}
                        {listing.liveUrl ? (
                          <Button
                            size="small"
                            variant="outlined"
                            endIcon={<OpenInNewRoundedIcon />}
                            href={listing.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            component="a"
                          >
                            Live app
                          </Button>
                        ) : null}
                      </Stack>
                    </Box>
                  </>
                )}

                <Divider />

                {!isPrivateRestricted && listingMongoId ? (
                  <>
                    <ListingReviewsPanel listingId={listingMongoId} />
                    <Divider />
                  </>
                ) : null}

                {isAuction &&
                  acceptedBidHistory.length > 0 && (
                    <Box>
                      <Typography
                        variant="overline"
                        color="text.secondary"
                        fontWeight={700}
                        display="block"
                        sx={{ mb: 1 }}
                      >
                        Accepted bid history
                      </Typography>
                      <Stack spacing={1}>
                        {acceptedBidHistory.map((bid) => (
                          <Box
                            key={bid._id || `${bid.amount}-${String(bid.createdAt)}`}
                            sx={{
                              py: 1,
                              px: 1.5,
                              borderRadius: 1,
                              bgcolor: "action.hover",
                            }}
                          >
                            <Typography variant="body2" fontWeight={600}>
                              {formatMoney(bid.amount, currency)}
                            </Typography>
                            {bid.createdAt ? (
                              <Typography variant="caption" color="text.secondary">
                                {new Date(bid.createdAt).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </Typography>
                            ) : null}
                          </Box>
                        ))}
                      </Stack>

                    </Box>
                  )}

                {isAuction && pendingBidsHistory.length > 0 ? (
                  <Box sx={{ mt: acceptedBidHistory.length > 0 ? 2 : 0 }}>
                    {bidActionMutation.isError ? (
                      <Alert severity="error" sx={{ mb: 1.5 }}>
                        {bidActionMutation.error instanceof Error
                          ? bidActionMutation.error.message
                          : "Could not update bid."}
                      </Alert>
                    ) : null}
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      fontWeight={700}
                      display="block"
                      sx={{ mb: 1 }}
                    >
                      Pending bids
                    </Typography>
                    <Stack spacing={1.25}>
                      {pendingBidsHistory.map((bid) => (
                        <Box
                          key={bid._id || `${bid.amount}-${String(bid.createdAt)}`}
                          sx={{
                            py: 1.25,
                            px: 1.5,
                            borderRadius: 1,
                            bgcolor: "action.hover",
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                            alignItems: { sm: "center" },
                            justifyContent: "space-between",
                            gap: 1.5,
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700}>
                              {formatMoney(bid.amount, currency)}
                            </Typography>
                            {bid.createdAt ? (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {new Date(bid.createdAt).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </Typography>
                            ) : null}
                            {isListingOwner && bid.bidderId ? (
                              <Typography variant="caption" color="text.secondary" display="block">
                                Bidder id {bid.bidderId.slice(0, 8)}…
                              </Typography>
                            ) : null}
                          </Box>
                          {isListingOwner ? (
                            <Stack direction="row" spacing={1} flexShrink={0}>
                              <Button
                                size="small"
                                color="success"
                                variant="outlined"
                                disabled={bidActionMutation.isPending}
                                onClick={() =>
                                  bid._id &&
                                  void bidActionMutation.mutateAsync({
                                    bidId: bid._id,
                                    status: "accepted",
                                  })
                                }
                              >
                                Accept
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                disabled={bidActionMutation.isPending}
                                onClick={() =>
                                  bid._id &&
                                  void bidActionMutation.mutateAsync({
                                    bidId: bid._id,
                                    status: "rejected",
                                  })
                                }
                              >
                                Decline
                              </Button>
                            </Stack>
                          ) : null}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                ) : null}
                
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }} sx={{ order: { xs: 1, md: 2 } }}>
            <Stack spacing={2}>
              {isPrivateRestricted ? (
                <Box
                  sx={{
                    width: "100%",
                    height: isMobile ? 260 : 320,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "action.hover",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <LockRoundedIcon sx={{ fontSize: 46, color: "text.secondary" }} />
                  <Typography variant="body2" color="text.secondary">
                    Private screenshots
                  </Typography>
                </Box>
              ) : (
                <CardMedia
                  component="img"
                  src={hero}
                  alt={listing.appName}
                  sx={{
                    width: "100%",
                    height: isMobile ? 260 : 320,
                    objectFit: "contain",
                    borderRadius: 3,
                    // border: "1px solid",
                    // borderColor: "divider",
                  }}
                />
              )}

              {!isPrivateRestricted && listing.photos && listing.photos.length > 1 ? (
                <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 0.5 }}>
                  {listing.photos.map((url) => (
                    <Box
                      key={url}
                      component="button"
                      type="button"
                      onClick={() => setHero(url)}
                      sx={{
                        p: 0,
                        border: hero === url ? "2px solid" : "1px solid",
                        borderColor: hero === url ? "secondary.main" : "divider",
                        borderRadius: 2,
                        overflow: "hidden",
                        cursor: "pointer",
                        bgcolor: "background.paper",
                        flexShrink: 0,
                      }}
                    >
                      <Box
                        component="img"
                        src={url}
                        alt=""
                        sx={{ width: 72, height: 72, objectFit: "cover", display: "block" }}
                      />
                    </Box>
                  ))}
                </Stack>
              ) : null}

              <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
                <Stack spacing={2}>
                  {isAuction ? (
                    <>
                      <Typography variant="subtitle2" color="text.secondary">
                        Current price
                      </Typography>
                      <Typography variant="h4" fontWeight={800}>
                        {formatMoney(
                          Number(
                            listing.auctionCurrentPrice ?? listing.startingPrice ?? 0,
                          ),
                          currency,
                        )}
                      </Typography>
                      {listing.monthlyRevenue != null ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          {formatMoney(listing.monthlyRevenue, currency)}/mo reported revenue
                        </Typography>
                      ) : null}
                      <Box
                        sx={{
                          py: 1.5,
                          px: 2,
                          borderRadius: 2,
                          bgcolor: "action.hover",
                          border: "1px dashed",
                          borderColor: "divider",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" display="block">
                          Auction ends in
                        </Typography>
                        <Typography variant="h6" fontWeight={700} color={countdown.ended ? "error" : "text.primary"}>
                          {countdown.label}
                        </Typography>
                      </Box>
                      {showAuctionBuyItNow && auctionBuyItNowPrice != null ? (
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Buy it now
                          </Typography>
                          <Typography variant="h5" fontWeight={800}>
                            {formatMoney(auctionBuyItNowPrice, currency)}
                          </Typography>
                          {auctionBuyItNowPrice > 999.99 ? (
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Image
                                src="https://secureapi.escrow.com/api/ecart/Content/Images/Affiliate%20Banners/banner-88x31.gif"
                                alt="Escrow eligible"
                                width={81}
                                height={31}
                              />
                              <Typography sx={{ fontSize: 11 }} variant="caption" color="text.secondary">
                                Escrow eligible
                              </Typography>
                            </Stack>
                          ) : null}
                        </Stack>
                      ) : null}
                      {isPrivateRestricted ? (
                        <>
                          {privateAccessMutation.isError ? (
                            <Alert severity="error" sx={{ borderRadius: 2 }}>
                              {privateAccessMutation.error instanceof Error
                                ? privateAccessMutation.error.message
                                : "Could not submit access request."}
                            </Alert>
                          ) : null}
                          <Alert severity="info" sx={{ borderRadius: 2 }}>
                            {privateRequestStatus === "pending"
                              ? "Your request is pending seller approval."
                              : "This private auction is hidden until the seller approves you."}
                          </Alert>
                          <Button
                            variant="contained"
                            size="large"
                            startIcon={<LockRoundedIcon />}
                            disabled={
                              privateAccessMutation.isPending ||
                              privateRequestStatus === "pending"
                            }
                            onClick={handleRequestPrivateAccess}
                            sx={{ borderRadius: 2, ...brandContainedButtonSx }}
                          >
                            {privateRequestStatus === "pending"
                              ? "Access requested"
                              : privateRequestStatus === "denied"
                                ? "Request access again"
                                : "Request access"}
                          </Button>
                        </>
                      ) : placeBidDisabled && bidTooltip ? (
                        <Tooltip title={bidTooltip}>
                          <Box component="span" sx={{ display: "block" }}>
                            <Stack spacing={0.5}>
                              <Button
                                variant="contained"
                                size="large"
                                startIcon={<GavelRoundedIcon />}
                                disabled={placeBidDisabled}
                                onClick={handlePlaceBid}
                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                              >
                                Place bid
                              </Button>
                              <SecureCheckoutNote />
                            </Stack>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Stack spacing={1.5}>
                          <Stack spacing={0.5}>
                            <Button
                              variant="contained"
                              size="large"
                              startIcon={<GavelRoundedIcon />}
                              disabled={placeBidDisabled}
                              onClick={handlePlaceBid}
                              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                            >
                              Place bid
                            </Button>
                            <SecureCheckoutNote />
                          </Stack>
                          {showAuctionBuyItNow ? (
                            auctionBuyItNowDisabled && auctionBuyItNowTooltip ? (
                              <Tooltip title={auctionBuyItNowTooltip}>
                                <Box component="span" sx={{ display: "block" }}>
                                  <Button
                                    variant="outlined"
                                    size="large"
                                    startIcon={<PaymentRoundedIcon />}
                                    disabled={auctionBuyItNowDisabled}
                                    onClick={handleAuctionBuyItNow}
                                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, width: "100%" }}
                                  >
                                    Buy it now
                                  </Button>
                                </Box>
                              </Tooltip>
                            ) : (
                              <Button
                                variant="outlined"
                                size="large"
                                startIcon={<PaymentRoundedIcon />}
                                disabled={auctionBuyItNowDisabled}
                                onClick={handleAuctionBuyItNow}
                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                              >
                                Buy it now
                              </Button>
                            )
                          ) : null}
                        </Stack>
                      )}
                    </>
                  ) : (
                    <>
                      <Typography variant="subtitle2" color="text.secondary">
                        Price
                      </Typography>
                      <Typography variant="h4" fontWeight={800}>
                        {formatMoney(buyPrice, currency)}
                      </Typography>
                      {buyPrice > 999.99 && 
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Image src="https://secureapi.escrow.com/api/ecart/Content/Images/Affiliate%20Banners/banner-88x31.gif" alt="escrow_eligble" width={81} height={31} />
                        <Typography sx={{ fontSize: 11 }} variant="caption" color="text.secondary">Escrow Eligible Listing</Typography>
                       <Tooltip placement="top" title="Listings priced at $1000 USD and over are eligible for escrow payment.">
                        <InfoRoundedIcon sx={{ fontSize: 16 }} />
                       </Tooltip>
                      </Stack>}
                      {listing.monthlyRevenue != null ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          {formatMoney(listing.monthlyRevenue, currency)}/mo reported revenue
                        </Typography>
                      ) : null}
                      {isPrivateRestricted ? (
                        <>
                          {privateAccessMutation.isError ? (
                            <Alert severity="error" sx={{ borderRadius: 2 }}>
                              {privateAccessMutation.error instanceof Error
                                ? privateAccessMutation.error.message
                                : "Could not submit access request."}
                            </Alert>
                          ) : null}
                          <Alert severity="info" sx={{ borderRadius: 2 }}>
                            {privateRequestStatus === "pending"
                              ? "Your request is pending seller approval."
                              : "This listing is private. Request access to unlock full details."}
                          </Alert>
                          <Button
                            variant="contained"
                            size="large"
                            startIcon={<LockRoundedIcon />}
                            disabled={
                              privateAccessMutation.isPending ||
                              privateRequestStatus === "pending"
                            }
                            onClick={handleRequestPrivateAccess}
                            sx={{ borderRadius: 2, ...brandContainedButtonSx }}
                          >
                            {privateRequestStatus === "pending"
                              ? "Access requested"
                              : privateRequestStatus === "denied"
                                ? "Request access again"
                                : "Request access"}
                          </Button>
                        </>
                      ) : buyItNowDisabled && buyTooltip ? (
                        <Tooltip title={buyTooltip}>
                          <Box component="span" sx={{ display: "block" }}>
                            <Stack spacing={0.5}>
                              <Button
                                onClick={handleBuyItNow}
                                variant="contained"
                                size="large"
                                disabled={buyItNowDisabled}
                                startIcon={<PaymentRoundedIcon />}
                                sx={{ borderRadius: 2, ...brandContainedButtonSx }}
                              >
                                Buy it now
                              </Button>
                              {buyPrice < 3999.99 && <SecureCheckoutNote />}
                            </Stack>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Stack spacing={0.5}>
                          <Button
                            onClick={handleBuyItNow}
                            variant="contained"
                            size="large"
                            disabled={buyItNowDisabled}
                            startIcon={<PaymentRoundedIcon />}
                            sx={{ borderRadius: 2, ...brandContainedButtonSx }}
                          >
                            Buy it now
                          </Button>
                          {buyPrice < 3999.99 && <SecureCheckoutNote />}
                        </Stack>
                      )}
                    </>
                  )}
                  {messageSellerDisabled && messageSellerTooltip ? (
                    <Tooltip title={messageSellerTooltip}>
                      <Box component="span" sx={{ display: "block" }}>
                        <Button
                          variant="outlined"
                          size="large"
                          startIcon={<ChatRoundedIcon />}
                          disabled={messageSellerDisabled}
                          onClick={handleMessageSeller}
                          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                        >
                          Message seller
                        </Button>
                      </Box>
                    </Tooltip>
                  ) : (
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<ChatRoundedIcon />}
                      disabled={messageSellerDisabled}
                      onClick={handleMessageSeller}
                      sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                    >
                      Message seller
                    </Button>
                  )}

                  {isOwner &&
                    listing.status !== "sold" &&
                    listing.status !== "removed" && (
                      <Stack spacing={1} sx={{ pt: 0.5 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={700}
                        >
                          Your listing
                        </Typography>
                        {listing.isPrivateListing && pendingPrivateAccessCount > 0 ? (
                          <Button
                            variant="contained"
                            color="warning"
                            size="large"
                            startIcon={<LockRoundedIcon />}
                            onClick={() => setPrivateAccessSellerModalOpen(true)}
                            sx={{
                              borderRadius: 2,
                              textTransform: "none",
                              fontWeight: 800,
                            }}
                          >
                            Review {pendingPrivateAccessCount} access request
                            {pendingPrivateAccessCount === 1 ? "" : "s"}
                          </Button>
                        ) : null}
                        <Button
                          component={Link}
                          href={`/verify-ownership?listingId=${encodeURIComponent(listingMongoId)}`}
                          variant="outlined"
                          size="large"
                          startIcon={<VerifiedIcon />}
                          sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                          }}
                        >
                          {listing.ownershipVerification?.isVerified
                            ? "Ownership verified"
                            : "Verify ownership"}
                        </Button>
                        <Button
                          component={Link}
                          href={`/products/verify?listingId=${encodeURIComponent(listingMongoId)}`}
                          variant="outlined"
                          size="large"
                          startIcon={<InsightsRoundedIcon />}
                          sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                          }}
                        >
                          Google Analytics &amp; verification
                        </Button>
                        <Tooltip
                          title={
                            editMeta?.canEdit === false
                              ? "Editing is disabled while there are bids or a purchase on this listing."
                              : ""
                          }
                        >
                          <Box component="span" sx={{ display: "block" }}>
                            <Button
                              component={Link}
                              href={`/products?edit=${encodeURIComponent(listingMongoId)}`}
                              variant="outlined"
                              size="large"
                              disabled={
                                editMetaLoading || editMeta?.canEdit === false
                              }
                              startIcon={<EditRoundedIcon />}
                              sx={{
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                              }}
                            >
                              Edit listing details
                            </Button>
                          </Box>
                        </Tooltip>
                        <Button
                          variant="outlined"
                          color="error"
                          size="large"
                          startIcon={<DeleteOutlineRoundedIcon />}
                          onClick={() => {
                            setDeleteListingError(null);
                            setDeleteListingOpen(true);
                          }}
                          sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                          }}
                        >
                          Delete listing
                        </Button>
                      </Stack>
                    )}

                  {hydrated &&
                  isLoggedIn &&
                  !isAuction &&
                  billingQueryEnabled &&
                  billingError ? (
                    <Alert severity="warning" sx={{ mt: 0.5 }}>
                      <Typography variant="body2">
                        We could not verify your saved cards. You can still continue in Stripe
                        Checkout. Open <Link href={walletHref}>Wallet</Link> if you want to fix
                        billing.
                      </Typography>
                    </Alert>
                  ) : null}

                  {hydrated &&
                  isLoggedIn &&
                  !isAuction &&
                  stripeCustomerId &&
                  !billingLoading &&
                  !billingError &&
                  !hasDefaultPaymentMethod ? (
                    <Alert severity="info" sx={{ mt: 0.5 }}>
                      <Typography variant="body2">
                        No default card on file yet. You can still pay on the next screen with{" "}
                        <b>Stripe Checkout</b>. Add cards in{" "}
                        <Link href={walletHref}>Wallet</Link> so they stay on your Stripe customer
                        for Checkout.
                      </Typography>
                    </Alert>
                  ) : null}

                  {hydrated && isLoggedIn && billingQueryEnabled && billingLoading ? (
                    <Typography variant="caption" color="text.secondary">
                      Checking your billing profile…
                    </Typography>
                  ) : null}
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Stack>

      {listing ? (
        <DeleteListingConfirmModal
          open={deleteListingOpen}
          listingTitle={listing.appName}
          loading={deleteListingLoading}
          error={deleteListingError}
          onClose={() => {
            if (!deleteListingLoading) {
              setDeleteListingOpen(false);
              setDeleteListingError(null);
            }
          }}
          onConfirm={() => void handleConfirmDeleteListingFromProductPage()}
        />
      ) : null}

      {listing && isOwner ? (
        <PrivateAccessRequestsModal
          open={privateAccessSellerModalOpen}
          listing={listing}
          onClose={() => setPrivateAccessSellerModalOpen(false)}
          onResolve={(listingId, requestId, decision) => {
            void handleResolvePrivateAccessOnListingPage(
              listingId,
              requestId,
              decision,
            );
          }}
          loadingKey={privateAccessResolveKey}
        />
      ) : null}

      <Dialog
        open={developerAccountsModalOpen}
        onClose={() => setDeveloperAccountsModalOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {
            developerAccountTransferModalCopy(listing?.platforms).title
          }
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {developerAccountTransferModalCopy(listing?.platforms).body}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, lineHeight: 1.6 }}>
            The seller will guide you through handover after purchase, but store transfers
            cannot be completed without the correct developer accounts in your name.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => setDeveloperAccountsModalOpen(false)}
            sx={{ textTransform: "none", fontWeight: 700, ...brandContainedButtonSx }}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={privateAccessDialogOpen}
        onClose={() => {
          if (privateAccessMutation.isPending) return;
          setPrivateAccessDialogOpen(false);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Request private access</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tell the seller why you are interested. They will review your request before
            unlocking full listing details.
          </Typography>
          <TextField
            label="Message (optional)"
            placeholder="Brief note for the seller…"
            value={privateAccessNote}
            onChange={(e) => setPrivateAccessNote(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            inputProps={{ maxLength: 500 }}
            disabled={privateAccessMutation.isPending}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setPrivateAccessDialogOpen(false)}
            disabled={privateAccessMutation.isPending}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmitPrivateAccessRequest()}
            disabled={privateAccessMutation.isPending}
            sx={{ textTransform: "none", fontWeight: 700, ...brandContainedButtonSx }}
          >
            {privateAccessMutation.isPending ? "Sending…" : "Send request"}
          </Button>
        </DialogActions>
      </Dialog>

      <AuctionBidModal
        open={bidModalOpen}
        onClose={() => setBidModalOpen(false)}
        listingTitle={listing.appName}
        currency={currency}
        currentPrice={Number(listing.auctionCurrentPrice ?? listing.startingPrice ?? 0)}
        minimumNextBid={Number(
          listing.auctionMinimumNextBid ??
            Math.ceil(
              (Math.round(
                Number(listing.auctionCurrentPrice ?? listing.startingPrice ?? 0) * 100,
              ) +
                100) /
                100,
            ),
        )}
        onSubmit={async (amountDollars) => {
          sessionStorage.setItem(
            PENDING_AUCTION_BID_KEY,
            JSON.stringify({
              listingId: String(listing._id),
              amount: amountDollars,
              submittedAt: new Date().toISOString(),
            }),
          );
          setBidModalOpen(false);
          router.push(`/checkout/${encodeURIComponent(String(listing._id))}`);
        }}
      />
    </Container>
  );
}
