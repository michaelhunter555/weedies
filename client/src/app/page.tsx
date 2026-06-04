"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { SecureCheckoutNote } from "@/components/Checkout/SecureCheckoutNote";
import Collection from "@/components/Collections/Collection";
import { PlatformSecurityModal } from "@/components/Marketing/PlatformSecurityModal";
import { ListingCoverImage } from "@/components/Listings/ListingCoverImage";
import { useListings } from "@/hooks/use-listings";
import {
  PLACEHOLDER_APP_COVER,
  resolveListingCoverUrl,
} from "@/utils/listing-cover";
import { scrollToSection } from "@/utils/sectionScroll";
import {
  BRAND_PALETTE,
} from "@/theme/brand-palette";
import type { Listing } from "../../types";

import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import { getCategoryLabel, LISTING_CATEGORIES } from "@/utils/listingOptions";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import LockIcon from '@mui/icons-material/Lock';
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Rating from "@mui/material/Rating";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useTheme from "@mui/material/styles/useTheme";
import useMediaQuery from "@mui/material/useMediaQuery";
const PALETTE = BRAND_PALETTE;

/** Homepage highlight row — swap captions when final copy is ready. */
const HIGHLIGHT_CARDS = [
  { image: "your_apps.png", caption: "You list apps that you've built and are ready to sell. " },
  { image: "homepage_pack/1.png", caption: "Connect with users interested in buying your app in the U.S and Canada." },
  { image: "homepage_pack/3.png", caption: "We provide the platform and security to guarantee a safe & secure exchange." },
] as const;

const HERO_CATEGORIES = LISTING_CATEGORIES;

function listingProductPath(listing: Listing) {
  const id = listing._id ? String(listing._id) : "";
  const slug = listing.slug ? String(listing.slug).trim() : "";
  if (slug && id) {
    return `/products/${encodeURIComponent(id)}/${encodeURIComponent(slug)}`;
  }
  if (id) return `/products/${encodeURIComponent(id)}`;
  if (slug) return `/products/${encodeURIComponent(slug)}`;
  return "/products";
}

function sellerLabel(listing: Listing) {
  const seller = listing.sellerId;
  if (!seller || typeof seller === "string") return "Independent creator";
  const s = seller as { name?: string; email?: string };
  if (s.name) return s.name;
  if (s.email) return s.email.split("@")[0];
  return "Independent creator";
}

function formatPrice(listing: Listing) {
  const price = Number(listing.startingPrice ?? 0);
  if (price === 0) return "Free";
  if (listing.saleType === "auction") return `From $${price}`;
  return `$${price}`;
}

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
}

function monthlyRevenueLabel(listing: Listing): string | null {
  if (listing.monthlyRevenue == null || !Number.isFinite(Number(listing.monthlyRevenue))) {
    return null;
  }
  return `${formatMoney(Number(listing.monthlyRevenue), listing.currency ?? "USD")}/mo revenue`;
}

export default function Home() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const [query, setQuery] = useState("");
  const [spotlight, setSpotlight] = useState<Listing | null>(null);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);

  const { getAllListings } = useListings();

  const { data: feed, isLoading: spotlightLoading } = useQuery({
    queryKey: ["homepage-spotlight-feed"],
    queryFn: () => getAllListings({ page: 1, limit: 40 }),
    staleTime: 60_000,
  });

  const feedItems = feed?.items;

  useEffect(() => {
    if (!feedItems?.length) {
      setSpotlight(null);
      return;
    }
    setSpotlight((prev) => {
      if (prev) return prev;
      const withCover = feedItems.filter(
        (l) => resolveListingCoverUrl(l) !== PLACEHOLDER_APP_COVER,
      );
      const pool = withCover.length > 0 ? withCover : feedItems;
      const idx = Math.floor(Math.random() * pool.length);
      return pool[idx];
    });
  }, [feedItems]);

  const spotlightPath = useMemo(
    () => (spotlight ? listingProductPath(spotlight) : "/products"),
    [spotlight],
  );

  const handleSearch = () => {
    if (query.trim().length === 0) {
      router.push("/products");
      return;
    }
    router.push(`/products?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>

      <Paper variant="outlined" sx={{ borderRadius: 1, p: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "center", sm: "flex-start" }}
        >
        <Stack flexShrink={0}>
          <Image src="/homepage_pack/5.png" alt="Your app idea is someone's treasure" width={100} height={100} />
        </Stack>
        <Stack sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>
            One Person&apos;s App is Another Person&apos;s Treasure.
          </Typography>
          <Typography variant="body1" color="text.secondary">
            For a limited time, list your next <span style={{ color: PALETTE.seafoam, fontWeight: 800, }}>3 Apps for Free</span>.
          </Typography>
        </Stack>
        </Stack>
      </Paper>
      {/* Search — above hero */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: { xs: 2, md: 2.5 },
          borderRadius: 4,
          
          backgroundColor: "#fff",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <TextField
            fullWidth
            placeholder="Search apps, creators, categories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            InputProps={{
              sx: {
                borderRadius: 999,
              },
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ color: PALETTE.seafoam }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            onClick={handleSearch}
            variant="contained"
            sx={{
              borderRadius: 999,
              textTransform: "none",
              fontWeight: 700,
              px: 3,
              py: 1.25,
              whiteSpace: "nowrap",
              backgroundColor: PALETTE.charcoal,
              boxShadow: "none",
              "&:hover": { backgroundColor: "#1a262b", boxShadow: "none" },
            }}
          >
            Explore
          </Button>
        </Stack>
      </Paper>

      {/* Hero */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 5,
          px: { xs: 3, md: 5 },
          py: { xs: 4, md: 5 },
          color: PALETTE.charcoal,
          backgroundColor: PALETTE.mint,
          border: `1px solid ${PALETTE.sage}`,
        }}
      >
        <Grid container spacing={{ xs: 3, md: 4 }} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={2}>
              <Chip
                icon={
                  <AutoAwesomeIcon
                    sx={{ fontSize: 16, color: `${PALETTE.charcoal} !important` }}
                  />
                }
                label="Discover apps to flip from indie builders"
                size="small"
                sx={{
                  width: "fit-content",
                  backgroundColor: "rgba(255,255,255,0.7)",
                  color: PALETTE.charcoal,
                  border: `1px solid ${PALETTE.sage}`,
                  fontWeight: 600,
                }}
              />
              <Typography
                variant={isMobile ? "h4" : "h3"}
                sx={{ fontWeight: 900, lineHeight: 1.1, color: PALETTE.charcoal }}
              >
                Discover and flip apps on{" "}
                <Box component="span" sx={{ color: PALETTE.seafoam }}>
                  Dap & Flip
                </Box>
                .
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ color: "rgba(37,52,58,0.82)", maxWidth: 520 }}
              >
                Buy and sell indie apps on dapandflip.com. List what you built
                and start earning.
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                sx={{ flexWrap: "wrap", gap: 1, mt: 0.5 }}
              >
                {HERO_CATEGORIES.map((c) => (
                  <Chip
                    key={c.value}
                    icon={c.icon}
                    clickable
                    label={c.label}
                    onClick={() => router.push(`/products?category=${c.value}`)}
                    sx={{
                      backgroundColor: "#fff",
                      color: PALETTE.charcoal,
                      border: `1px solid ${PALETTE.sage}`,
                      "&:hover": { backgroundColor: PALETTE.sage },
                      "& .MuiChip-icon": { color: PALETTE.seafoam },
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          </Grid>

        {!isMobile && !isTablet &&  <Grid
            size={{ xs: 12, md: 5 }}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                position: "relative",
                width: "100%",
                maxWidth: { xs: 260, sm: 300, md: 340 },
                aspectRatio: "1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${PALETTE.sage}`,
                borderRadius: 2,
                p: 2,
              }}
            >
              <Image
                src="/homepage_pack/3.png"
                alt="Dap & Flip"
                width={150}
                height={150}
              />
              <Stack direction="row" alignItems="center" spacing={1}>

              <LockIcon sx={{ fontSize: 20, color: PALETTE.seafoam }} />
              <Typography sx={{ fontWeight: 700, fontSize: 20 }} variant="body2" color="text.secondary">
                Safe & Secure Acquisitions.
              </Typography>
              </Stack>
              <Typography sx={{ fontSize: 12 }} variant="caption" color="text.secondary">
                No app too big or small. We&apos;ve got you covered.
              </Typography>
              <Divider sx={{ width: '100%', borderColor: PALETTE.sage, my: 2 }} />
              <Chip
                clickable
                onClick={() => setSecurityModalOpen(true)}
                variant="filled"
                label="Learn More"
                size="medium"
                sx={{
                  backgroundColor: PALETTE.seafoam,
                  color: PALETTE.mint,
                  fontWeight: 700,
                  "&:hover": { backgroundColor: PALETTE.charcoal, color: PALETTE.onPrimary },
                }}
              />
            </Box>
          </Grid>}
        </Grid>
      </Paper>

      <Stack spacing={5} sx={{ mt: 5 }}>
        <Collection
          collectionName="Trending this week"
          subtitle="What the community is vibing with right now."
          count={25}
        />
        <Divider sx={{ borderColor: PALETTE.sage }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800, letterSpacing: 1, color: PALETTE.charcoal }}
            >
              {spotlight
                ? `Buy ${spotlight.appName}`
                : "App of The Day"}
            </Typography>
            <RocketLaunchRoundedIcon fontSize="small" sx={{ color: PALETTE.seafoam }} />
          </Stack>
        </Divider>

        {/* Spotlight — random live listing (fixed image height; do not stretch row) */}
        <Grid
          id="product"
          container
          spacing={{ xs: 2, md: 3 }}
          alignItems="flex-start"
        >
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 3,
                borderColor: PALETTE.sage,
              }}
            >
              {spotlightLoading ? (
                <Skeleton
                  variant="rounded"
                  sx={{ width: "100%", height: { xs: 220, md: 320 }, borderRadius: 3 }}
                />
              ) : spotlight ? (
                <Box
                  sx={{
                    width: "100%",
                    height: { xs: 220, md: 320 },
                    borderRadius: 3,
                    overflow: "hidden",
                    border: `1px solid ${PALETTE.sage}`,
                    backgroundColor: PALETTE.mint,
                  }}
                >
                  <ListingCoverImage
                    listing={spotlight}
                    alt={`${spotlight.appName} cover`}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    height: { xs: 220, md: 320 },
                    borderRadius: 3,
                    border: `1px dashed ${PALETTE.sage}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: PALETTE.mint,
                  }}
                >
                  <Typography color="text.secondary">
                    No live apps yet. Be the first to list.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: 3,
                borderColor: PALETTE.sage,
              }}
            >
              {spotlightLoading ? (
                <Stack spacing={1.5}>
                  <Skeleton width="40%" height={28} />
                  <Skeleton width="70%" height={36} />
                  <Skeleton width="55%" height={24} />
                  <Skeleton variant="rounded" height={48} />
                </Stack>
              ) : spotlight ? (
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip
                      label={getCategoryLabel(spotlight.category)}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        backgroundColor: PALETTE.mint,
                        color: PALETTE.charcoal,
                      }}
                    />
                    {Number(spotlight.startingPrice ?? 0) > 0 ? (
                      <Chip
                        icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                        label="Pro"
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: PALETTE.seafoam, color: PALETTE.charcoal }}
                      />
                    ) : (
                      <Chip
                        label="Free"
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                  </Stack>

                  <Typography variant="h5" sx={{ fontWeight: 800, color: PALETTE.charcoal }}>
                    {spotlight.appName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    by <b>{sellerLabel(spotlight)}</b>
                  </Typography>

                  <Rating
                    readOnly
                    precision={0.5}
                    value={Number(spotlight.averageRating ?? 0)}
                    size="small"
                  />

                  <Typography variant="h4" sx={{ fontWeight: 800, color: PALETTE.charcoal }}>
                    {formatPrice(spotlight)}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {spotlight.tagline || "Explore this listing on Dap & Flip."}
                  </Typography>

                  {monthlyRevenueLabel(spotlight) ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: 600 }}
                    >
                      {monthlyRevenueLabel(spotlight)}
                    </Typography>
                  ) : null}

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                      size="small"
                      icon={<VisibilityRoundedIcon sx={{ fontSize: 14 }} />}
                      label={`${spotlight.views ?? 0} views`}
                      variant="outlined"
                      sx={{ borderColor: PALETTE.sage }}
                    />
                    <Chip
                      size="small"
                      icon={<BoltRoundedIcon sx={{ fontSize: 14 }} />}
                      label="Live on marketplace"
                      variant="outlined"
                      sx={{ borderColor: PALETTE.sage }}
                    />
                  </Stack>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", sm: "start" }}
                    sx={{ pt: 1 }}
                  >
                    <Button
                      variant="outlined"
                      startIcon={<StorefrontRoundedIcon />}
                      sx={{
                        borderRadius: 2,
                        textTransform: "none",
                        borderColor: PALETTE.seafoam,
                        color: PALETTE.charcoal,
                      }}
                      onClick={() => router.push(spotlightPath)}
                    >
                      View app page
                    </Button>
                    <Stack spacing={0.5} sx={{ minWidth: { sm: 200 } }}>
                      <Button
                        variant="contained"
                        size="medium"
                        endIcon={<RocketLaunchRoundedIcon />}
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 700,
                          backgroundColor: PALETTE.charcoal,
                          boxShadow: "none",
                          "&:hover": { backgroundColor: "#1a262b", boxShadow: "none" },
                        }}
                        onClick={() => {
                          if (spotlight._id) {
                            router.push(
                              `/checkout/${encodeURIComponent(String(spotlight._id))}`,
                            );
                          }
                        }}
                        disabled={!spotlight._id}
                      >
                        Buy {spotlight.appName}
                      </Button>
                      <SecureCheckoutNote>
                        Safe &amp; secure checkout with Stripe.
                      </SecureCheckoutNote>
                    </Stack>
                  </Stack>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Nothing to spotlight yet
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => router.push("/products?list=new")}
                    sx={{
                      width: "fit-content",
                      borderRadius: 999,
                      textTransform: "none",
                      backgroundColor: PALETTE.charcoal,
                    }}
                  >
                    List your app
                  </Button>
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>

        {isMobile && isTablet && (
          <Divider sx={{ borderColor: PALETTE.sage }} />
        )}

        {/* Creator CTA — separate block; spacing won't stretch spotlight image */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            p: { xs: 3, md: 5 },
            backgroundColor: PALETTE.mint,
            border: `1px solid ${PALETTE.sage}`,
          }}
        >
          <Grid container alignItems="center" spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography
                variant="overline"
                sx={{ fontWeight: 700, color: PALETTE.seafoam }}
              >
                For creators
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, mb: 1, color: PALETTE.charcoal }}
              >
                Shipped something this weekend? List it in 5 minutes.
              </Typography>
              <Typography sx={{ color: "rgba(37,52,58,0.8)" }}>
                Keep up to 94% of revenue. Built-in payments, licenses and reviews,
                so you can focus on the next build.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={1} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => router.push("/products?list=new")}
                  sx={{
                    borderRadius: 999,
                    textTransform: "none",
                    fontWeight: 700,
                    px: 3,
                    backgroundColor: PALETTE.charcoal,
                    boxShadow: "none",
                    "&:hover": { backgroundColor: "#1a262b", boxShadow: "none" },
                  }}
                >
                  List your app
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {/* How it works — 1 → 2 → 3 stepper */}
        <Stack spacing={2}>
          <Typography
            variant="h5"
            fontWeight={800}
            textAlign="center"
            sx={{ color: PALETTE.charcoal }}
          >
            How it works
          </Typography>

          <Grid container spacing={{ xs: 0, md: 2 }} justifyContent="center">
            {HIGHLIGHT_CARDS.map((card, index) => {
              const step = index + 1;
              const isFirst = index === 0;
              const isLast = index === HIGHLIGHT_CARDS.length - 1;

              return (
                <Grid key={card.image} size={{ xs: 12, md: 4 }}>
                  <Stack
                    direction={{ xs: "row", md: "column" }}
                    alignItems={{ xs: "flex-start", md: "center" }}
                    sx={{ height: "100%" }}
                  >
                    {/* Vertical rail (mobile) */}
                    <Stack
                      alignItems="center"
                      sx={{
                        display: { xs: "flex", md: "none" },
                        width: 40,
                        flexShrink: 0,
                        alignSelf: "stretch",
                        pt: 0.5,
                      }}
                    >
                      {!isFirst ? (
                        <Box
                          sx={{
                            width: 2,
                            flex: 1,
                            minHeight: 16,
                            bgcolor: PALETTE.sage,
                            borderRadius: 1,
                          }}
                        />
                      ) : null}
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "0.95rem",
                          flexShrink: 0,
                          bgcolor: PALETTE.charcoal,
                          color: PALETTE.onPrimary,
                          border: `2px solid ${PALETTE.seafoam}`,
                        }}
                      >
                        {step}
                      </Box>
                      {!isLast ? (
                        <Box
                          sx={{
                            width: 2,
                            flex: 1,
                            minHeight: 24,
                            bgcolor: PALETTE.sage,
                            borderRadius: 1,
                          }}
                        />
                      ) : null}
                    </Stack>

                    <Stack sx={{ flex: 1, width: "100%", minWidth: 0 }} spacing={1.5}>
                      {/* Horizontal rail (desktop) */}
                      <Stack
                        direction="row"
                        alignItems="center"
                        sx={{
                          display: { xs: "none", md: "flex" },
                          width: "100%",
                          px: 1,
                        }}
                      >
                        <Box
                          sx={{
                            flex: 1,
                            height: 2,
                            bgcolor: isFirst ? "transparent" : PALETTE.sage,
                            borderRadius: 1,
                          }}
                        />
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            mx: 1,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "1rem",
                            flexShrink: 0,
                            bgcolor: PALETTE.charcoal,
                            color: PALETTE.onPrimary,
                            border: `2px solid ${PALETTE.seafoam}`,
                          }}
                        >
                          {step}
                        </Box>
                        <Box
                          sx={{
                            flex: 1,
                            height: 2,
                            bgcolor: isLast ? "transparent" : PALETTE.sage,
                            borderRadius: 1,
                          }}
                        />
                      </Stack>

                      <Paper
                        elevation={0}
                        variant="outlined"
                        sx={{
                          borderRadius: 3,
                          borderColor: PALETTE.sage,
                          bgcolor: "background.paper",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          p: 2,
                          ml: { xs: 0, md: 0 },
                        }}
                      >
                        <Box
                          sx={{
                            width: "100%",
                            maxWidth: 220,
                            aspectRatio: "1",
                            mx: "auto",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: PALETTE.mint,
                            borderRadius: 2,
                            border: `1px solid ${PALETTE.sage}`,
                          }}
                        >
                          <Box
                            component="img"
                            src={card.image}
                            alt={`Step ${step}`}
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                              display: "block",
                            }}
                          />
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          align="center"
                          sx={{ mt: 1.5, fontWeight: 600, lineHeight: 1.5 }}
                        >
                          {card.caption}
                        </Typography>
                      </Paper>
                    </Stack>
                  </Stack>
                </Grid>
              );
            })}
          </Grid>
        </Stack>

        {/* Full 100% Support */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            p: { xs: 3, md: 5 },
            background: 'linear-gradient(135deg, #f4fff8 0%, #c4e0d3 100%)',
            border: `1px solid ${PALETTE.sage}`,
          }}
        >
          <Grid container alignItems="center" spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography
                variant="overline"
                sx={{ fontWeight: 700, color: PALETTE.seafoam }}
              >
                Got a Question? Let&apos;s Chat!
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, mb: 1, color: PALETTE.charcoal }}
              >
                We&apos;re here to help. Get in touch with our support team.
              </Typography>
              
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={1} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<SupportAgentIcon />}
                  onClick={() => router.push("/contact-us")}
                  sx={{
                    borderRadius: 999,
                    textTransform: "none",
                    fontWeight: 700,
                    px: 3,
                    
                    boxShadow: "none",
                    
                  }}
                >
                  Contact Support
                </Button>
               
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Stack>

      <PlatformSecurityModal
        open={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
      />
    </Container>
  );
}
