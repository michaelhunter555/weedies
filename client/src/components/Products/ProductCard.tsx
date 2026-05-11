"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Box,
  Button,
  CardMedia,
  Chip,
  Paper,
  Rating,
  Stack,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import type { Listing } from "../../../types";

interface IProductCard {
  /** Preferred: the full listing document from the API. */
  listing?: Listing;
  /** Optional explicit override (used by the dashboard / link previews). */
  id?: string;
}

const PLACEHOLDER_COVER = "/placeholder-app-cover.svg";

const ACCENT_PALETTE = [
  "#7c3aed",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#2563eb",
  "#06b6d4",
  "#8b5cf6",
  "#ef4444",
  "#0ea5e9",
  "#d946ef",
];

function hashIndex(id: string | undefined, mod: number) {
  if (!id) return 0;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

function formatCategory(raw?: string) {
  if (!raw) return "App";
  return raw
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractSellerName(
  sellerId: Listing["sellerId"] | undefined,
): string | null {
  if (!sellerId) return null;
  if (typeof sellerId === "string") return null;
  const s = sellerId as unknown as { name?: string; email?: string };
  if (s?.name) return s.name;
  if (s?.email) return s.email.split("@")[0];
  return null;
}

export default function ProductCard({ listing, id }: IProductCard) {
  const router = useRouter();
  const [hover, setHover] = useState<boolean>(false);

  const resolvedId = listing?._id || id;
  const resolvedName = listing?.appName || "Untitled app";
  const resolvedTagline =
    listing?.tagline || "No tagline yet — check back soon.";
  const category = formatCategory(listing?.category);
  const cover = useMemo(() => {
    if (!listing?.photos || listing.photos.length === 0) return PLACEHOLDER_COVER;
    const idx = Math.min(
      Math.max(0, listing.coverIndex ?? 0),
      listing.photos.length - 1,
    );
    return listing.photos[idx];
  }, [listing]);

  const accent = useMemo(
    () => ACCENT_PALETTE[hashIndex(resolvedId, ACCENT_PALETTE.length)],
    [resolvedId],
  );

  const price = Number(listing?.startingPrice ?? 0);
  const isFree = price === 0;
  const tier: "Free" | "Pro" | "One-time" = isFree
    ? "Free"
    : listing?.saleType === "auction"
      ? "One-time"
      : "Pro";
  const tierColor: Record<string, "success" | "secondary" | "warning"> = {
    Free: "success",
    Pro: "secondary",
    "One-time": "warning",
  };

  const creator = extractSellerName(listing?.sellerId);
  const installs = listing?.views ?? 0;
  const rating = listing?.averageRating ?? 0;
  const reviews = listing?.totalReviews ?? 0;

  const handleOpen = () => {
    if (resolvedId) router.push(`/products/${resolvedId}`);
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
        borderColor: hover ? "rgba(124,58,237,0.45)" : "#ececec",
        transform: hover ? "translateY(-2px)" : "none",
        boxShadow: hover ? "0 10px 24px rgba(17,17,17,0.08)" : "none",
        cursor: resolvedId ? "pointer" : "default",
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
            background: `linear-gradient(135deg, ${accent}22 0%, ${accent}0a 100%)`,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)",
          }}
        />
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
          icon={
            tier === "Pro" ? (
              <AutoAwesomeIcon sx={{ fontSize: 14 }} />
            ) : undefined
          }
          label={tier}
          sx={{
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
              {resolvedName}
            </Typography>
            {creator && (
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

      <Stack direction="column" spacing={1} sx={{ padding: 2 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            minHeight: 40,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {resolvedTagline}
        </Typography>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Rating value={rating} precision={0.1} readOnly size="small" />
            <Typography variant="caption" color="text.secondary">
              {rating ? rating.toFixed(1) : "—"} ({reviews})
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <DownloadRoundedIcon
              sx={{ fontSize: 16, color: "text.secondary" }}
            />
            <Typography variant="caption" color="text.secondary">
              {installs}
            </Typography>
          </Stack>
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
            disabled={!resolvedId}
            sx={{
              borderRadius: 999,
              textTransform: "none",
              boxShadow: "none",
              background: "linear-gradient(135deg, #111827 0%, #374151 100%)",
              "&:hover": { background: "#111827" },
            }}
          >
            {isFree ? "Get app" : "View app"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
