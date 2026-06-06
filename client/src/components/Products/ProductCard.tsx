"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Box,
  Button,
  CardMedia,
  Chip,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { BRAND_PALETTE } from "@/theme/brand-palette";
import { getCategoryLabel } from "@/utils/listingOptions";
import type { Listing, Platforms } from "../../../types";
import { PLATFORM_MAPPING } from "@/utils/listingOptions";

interface IProductCard {
  /** Preferred: the full listing document from the API. */
  listing?: Listing;
  /** Optional explicit override (used by the dashboard / link previews). */
  id?: string;
}

const PLACEHOLDER_COVER = "/placeholder-app-cover.svg";

const ACCENT_PALETTE = [
  BRAND_PALETTE.seafoam,
  BRAND_PALETTE.charcoal,
  BRAND_PALETTE.sage,
  "#6f9d92",
  "#5a8f83",
  "#4a7d72",
  "#3d6b61",
  "#2f5951",
  "#244a44",
  "#1a3a36",
];

function hashIndex(id: string | undefined, mod: number) {
  if (!id) return 0;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
}

function extractSellerName(
  sellerId: Listing["sellerId"] | undefined,
): string | null {
  if (!sellerId || typeof sellerId === "string") return null;
  if (sellerId.name) return sellerId.name;
  if (sellerId.email) return sellerId.email.split("@")[0] ?? null;
  return null;
}

export default function ProductCard({ listing, id }: IProductCard) {
  const router = useRouter();
  const [hover, setHover] = useState<boolean>(false);

  const pathSegment = listing?.slug || listing?._id || id;
  const isPrivateRestricted = Boolean(
    listing?.isPrivateListing && listing?.privateAccess?.canView === false,
  );
  const resolvedName = listing?.appName || "Untitled app";
  const resolvedTagline =
    listing?.tagline || "No tagline yet - check back soon.";
  const monthlyRevenueLabel =
    listing?.monthlyRevenue != null &&
    Number.isFinite(Number(listing.monthlyRevenue))
      ? formatMoney(
          Number(listing.monthlyRevenue),
          listing?.currency ?? "USD",
        )
      : null;
  const category = getCategoryLabel(listing?.category);
  const cover = useMemo(() => {
    if (!listing?.photos || listing.photos.length === 0) return PLACEHOLDER_COVER;
    const idx = Math.min(
      Math.max(0, listing.coverIndex ?? 0),
      listing.photos.length - 1,
    );
    return listing.photos[idx];
  }, [listing]);

  const accent = useMemo(
    () => ACCENT_PALETTE[hashIndex(pathSegment, ACCENT_PALETTE.length)],
    [pathSegment],
  );

  const price = Number(listing?.startingPrice ?? 0);
  const isFree = price === 0;
  const tier: "Free" | "Pro" | "Auction" | "Buy it Now" = isFree
    ? "Free"
    : listing?.saleType === "auction"
      ? "Auction"
      : "Buy it Now";
  const tierColor: Record<string, "success" | "secondary" | "warning"> = {
    Free: "success",
    Pro: "secondary",
    Auction: "secondary",
    "Buy it Now": "secondary",
  };

  const availablePlatforms =PLATFORM_MAPPING.filter(
    (platform) => listing?.platforms?.includes(platform.value) && platform.iconCard);

  const creator = extractSellerName(listing?.sellerId);
  const installs = listing?.views ?? 0;

  const handleOpen = () => {
    const mongoId = listing?._id ? String(listing._id) : null;
    const slug = listing?.slug ? String(listing.slug).trim() : "";
    if (slug && mongoId) {
      router.push(
        `/products/${encodeURIComponent(mongoId)}/${encodeURIComponent(slug)}`,
      );
    } else if (mongoId) {
      router.push(`/products/${encodeURIComponent(mongoId)}`);
    } else if (slug) {
      router.push(`/products/${encodeURIComponent(slug)}`);
    }
  };

  return (
    <Paper
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      variant="outlined"
      sx={{
        borderRadius: 3,
        padding: 0,
        overflow: "hidden",
        transition:
          "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
        borderColor: hover ? BRAND_PALETTE.seafoam : BRAND_PALETTE.borderSubtle,
        transform: hover ? "translateY(-2px)" : "none",
        boxShadow: hover ? "0 10px 24px rgba(17,17,17,0.08)" : "none",
        cursor: pathSegment ? "pointer" : "default",
      }}
      onClick={handleOpen}
    >
      <Box sx={{ position: "relative" }}>
        <CardMedia
          component="img"
          src={cover}
          alt={`${resolvedName}-cover`}
          sx={{
            width: "100%",
            height: 160,
            objectFit: "cover",
            backgroundColor: BRAND_PALETTE.mint,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(37, 52, 58, 0.42)",
          }}
        />
        {isPrivateRestricted ? (
          <Stack
            sx={{
              position: "absolute",
              inset: 0,
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <LockRoundedIcon sx={{ fontSize: 38, opacity: 0.95 }} />
          </Stack>
        ) : null}
        <Stack
          direction="row"
          spacing={1}
          sx={{ position: "absolute", top: 8, left: 8 }}
        >
          <Chip
            size="small"
            label={category}
            sx={{
              backgroundColor: "rgba(255,255,255,0.9)",
              fontWeight: 600,
              fontSize: 11,
            }}
          />
        </Stack>
        <Chip
          size="small"
          color={tierColor[tier]}
          label={tier}
          sx={{
            backgroundColor: "#000",
            color: "#fff",
            position: "absolute",
            top: 8,
            right: 8,
            fontWeight: 700,
            fontSize: 11,
          }}
        />

        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ position: "absolute", left: 10, bottom: 10 }}
        >
          <Avatar
            sx={{
              width: 28,
              height: 28,
              bgcolor: accent,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {resolvedName.slice(0, 1).toUpperCase()}
          </Avatar>
          <Stack sx={{ lineHeight: 1 }}>
            <Typography
              sx={{ color: "#fff", fontWeight: 700, lineHeight: 1.1 }}
              variant="subtitle2"
            >
              {isPrivateRestricted ? "Private listing" : resolvedName}
            </Typography>
            {isPrivateRestricted ? (
              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.85)" }}
              >
                Seller hidden
              </Typography>
            ) : creator && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {creator}
                </Typography>
                {listing?.isListingVerified && (
                  <VerifiedRoundedIcon
                    sx={{ fontSize: 12, color: "#a7f3d0" }}
                  />
                )}
              </Stack>
            )}
          </Stack>
        </Stack>
      </Box>

      <Stack direction="column" spacing={1.25} sx={{ padding: 2 }}>
        <Stack spacing={0.25}>
          <Stack direction="row" alignItems="center" spacing={1}>
              {availablePlatforms?.map((platform, platformIndex) => (
              <Stack key={platform.value} direction="row" alignItems="center" spacing={0.5}>
                <Stack direction="column" alignItems="center" spacing={0.5} sx={{ minWidth: 40}}>
              <Tooltip title={`Sale comes with ${platform.label} version`}>
                {platform.iconCard}
              </Tooltip>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 8 }}>
                    {platform.label}
                  </Typography>
                </Stack>
                  {platformIndex < availablePlatforms.length - 1 && <Divider orientation="vertical" sx={{ height: 20 }}/>}
                </Stack>
            ))}
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {isPrivateRestricted
              ? "Request access to unlock full listing details."
              : resolvedTagline}
          </Typography>
          {monthlyRevenueLabel && Number(listing?.monthlyRevenue ) > 0 ? (
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, lineHeight: 1.2 }}
            >
              {monthlyRevenueLabel}/mo revenue
            </Typography>
          ) : null}
        </Stack>

        <Stack direction="row" alignItems="center" spacing={0.5}>
          <VisibilityRoundedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <Typography variant="caption" color="text.secondary">
            {installs.toLocaleString()} views
          </Typography>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography sx={{ fontWeight: 800 }}>
            {isFree ? "Free" : `$${price}`}
          </Typography>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleOpen();
            }}
            size="small"
            variant="contained"
            disabled={!pathSegment}
            sx={{
              borderRadius: 999,
              textTransform: "none",
              boxShadow: "none",
              backgroundColor: BRAND_PALETTE.charcoal,
              "&:hover": { background: "#111827" },
            }}
          >
            {isPrivateRestricted
              ? "Request access"
              : isFree
                ? "Get app"
                : "View app"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
