"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { SecureCheckoutNote } from "@/components/Checkout/SecureCheckoutNote";
import Collection from "@/components/Collections/Collection";
import { PlatformSecurityModal } from "@/components/Marketing/PlatformSecurityModal";
import { ListingCoverImage } from "@/components/Listings/ListingCoverImage";
import { ListingPlatformsRow } from "@/components/Listings/ListingPlatformsRow";
import { useListings } from "@/hooks/use-listings";
import {
  PLACEHOLDER_APP_COVER,
  resolveListingCoverUrl,
} from "@/utils/listing-cover";
import { mongoIdString } from "@/utils/mongo-id";
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
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LockIcon from '@mui/icons-material/Lock';
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useTheme from "@mui/material/styles/useTheme";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useAuth } from "@/context/auth-context";
import TrustPoints from "@/components/TrustCheckpoints/TrustPoints";
import { Card, CardContent, Tooltip } from "@mui/material";
import CustomEditChatChip from "@/components/SparkleGradientChip/SparkleGradientChip";
import { HomeMosiacGrid } from "@/components/MosiacHome/MosiacGrid";
import { HowItWorksStepper } from "@/components/Marketing/HowItWorksStepper";
const PALETTE = BRAND_PALETTE;

/** Editorial cards at the foot of the homepage. Link to static guide pages. */
const CONTENT_CARDS = [
  {
    image: "/flipapp.png",
    eyebrow: "Guide",
    title: "How to flip your app in 2026 to 2027",
    description:
      "A practical playbook for finding, improving, and reselling indie apps this cycle.",
    href: "/guides/how-to-flip-your-app",
  },
  {
    image: "/valuesdapandflip.png",
    eyebrow: "Our story",
    title: "The culture and values of Dap & Flip",
    description:
      "Trust, honesty, and respect. The principles behind every exchange.",
    href: "/guides/culture-and-values",
  },
  {
    image: "/yourapps.png",
    eyebrow: "Get started",
    title: "How to use Dap & Flip",
    description:
      "From listing your first app to a secure handover. The full walkthrough.",
    href: "/guides/how-to-use-our-site",
  },
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

function hasStoredAppSession() {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(
      localStorage.getItem("weedies.user") &&
        localStorage.getItem("weedies.accessToken"),
    );
  } catch {
    return false;
  }
}

export default function Home() {
  const router = useRouter();
  const { user, isLoggedIn, hydrated, sessionReady, accessToken } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const [query, setQuery] = useState("");
  const [spotlight, setSpotlight] = useState<Listing | null>(null);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);

  const { getAllListings } = useListings();

  const hasActiveSession = useMemo(() => {
    if (isLoggedIn || Boolean(user?.id) || Boolean(accessToken)) return true;
    if (!hydrated) return false;
    return hasStoredAppSession();
  }, [hydrated, isLoggedIn, user?.id, accessToken, sessionReady]);

  const showHomeMosaic = hydrated && sessionReady && !hasActiveSession;

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

  const spotlightSellerId = useMemo(
    () => (spotlight ? mongoIdString(spotlight.sellerId) : ""),
    [spotlight],
  );

  const isSpotlightOwner = useMemo(
    () =>
      Boolean(
        spotlightSellerId &&
          user?.id &&
          mongoIdString(user.id) === spotlightSellerId,
      ),
    [spotlightSellerId, user?.id],
  );

  const handleSearch = () => {
    if (query.trim().length === 0) {
      router.push("/products");
      return;
    }
    router.push(`/products?q=${encodeURIComponent(query.trim())}`);
  };

  const handleMessageSpotlightSeller = () => {
    if (!spotlight || isSpotlightOwner || !spotlightSellerId) return;
    if (!user?.id) {
      router.push("/signup?action=signup");
      return;
    }
    const q = new URLSearchParams();
    q.set("sellerId", spotlightSellerId);
    if (spotlight._id) q.set("listingId", String(spotlight._id));
    if (spotlight.appName) q.set("subject", spotlight.appName);
    router.push(`/messages?${q}`);
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
          borderRadius: 1,
          
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
                borderRadius: "10px",
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
              borderRadius: "10px",
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
          borderRadius: 1,
          px: { xs: 3, md: 5 },
          py: { xs: 4, md: 5 },
          color: PALETTE.charcoal,
          backgroundColor: PALETTE.mint,
          border: `1px solid ${PALETTE.sage}`,
          mb: 5
        }}
      >
        <Grid container spacing={{ xs: 3, md: 4 }} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={2}>
              <Chip
                label="Starter and Established Apps for sale"
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
                Your Digital Business Journey{" "}
                <Box component="span" sx={{ color: PALETTE.seafoam }}>
                  Starts Here
                </Box>
                .
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ color: "rgba(37,52,58,0.82)", maxWidth: 520 }}
              >
                Skip to the 0 to 1 hustle. Start with something ready to go.
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
                borderRadius: 1,
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

      {showHomeMosaic ? <HomeMosiacGrid /> : null}

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
        
        <Card elevation={5} sx={{ height: "100%", width: "100%" }}>
          <CardContent>
            <Grid
          id="product"
          container
          spacing={{ xs: 2, md: 3 }}
          alignItems="flex-start"
        >
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
            elevation={0}
              sx={{
                p: 2,
                borderRadius: 1,
                borderColor: PALETTE.sage,
              }}
            >
              {spotlightLoading ? (
                <Skeleton
                  variant="rounded"
                  sx={{ width: "100%", height: { xs: 220, md: 320 }, borderRadius: 1 }}
                />
              ) : spotlight ? (
                <Box
                  sx={{
                    width: "100%",
                    height: { xs: 220, md: 320 },
                    borderRadius: 1,
                    overflow: "hidden",
                   
                  }}
                >
                  <ListingCoverImage
                    listing={spotlight}
                    alt={`${spotlight.appName} cover`}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    height: { xs: 220, md: 320 },
                    borderRadius: 1,
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

          <Divider sx={{ display: { xs: "none", md: "block" } }} orientation="vertical" flexItem />

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: 1,
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
                    {monthlyRevenueLabel(spotlight) && Number(monthlyRevenueLabel(spotlight)) > 0 ? (
                    <Tooltip title={`${monthlyRevenueLabel(spotlight)}/mo revenue`}>
                     <AttachMoneyIcon
                       sx={{
                         fontSize: 18,
                         color: "#2f5f52",
                         backgroundColor: "rgba(244, 255, 248, 0.94)",
                         border: `1px solid ${BRAND_PALETTE.sage}`,
                         borderRadius: "50%",
                         p: 0.45,
                         boxShadow: "0 1px 2px rgba(37, 52, 58, 0.12)",
                       }}
                     />
                   </Tooltip>
                    ) : null}
            
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              
                  <ListingCoverImage
                    listing={spotlight}
                    alt={`${spotlight.appName} cover`}
                    sx={{
                      borderRadius: 1,
                      width: 40,
                      height: 40,
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                  <Typography variant="h5" sx={{ fontWeight: 800, color: PALETTE.charcoal }}>
                    {spotlight.appName}
                  </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    by <b>{sellerLabel(spotlight)}</b>
                  </Typography>

                  <Typography variant="h4" sx={{ fontWeight: 800, color: PALETTE.charcoal }}>
                    {formatPrice(spotlight)}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="start">
                    <CustomEditChatChip
                      disabled={!spotlightSellerId || isSpotlightOwner}
                      onClick={handleMessageSpotlightSeller}
                    />
                  </Stack>


                  {spotlight.platforms && spotlight.platforms.length > 0 ? (
                    <ListingPlatformsRow
                      platforms={spotlight.platforms}
                      size="card"
                      sx={{ mt: 0.25 }}
                    />
                  ) : null}

                  <Typography variant="body2" color="text.secondary">
                    {spotlight.tagline || "Explore this listing on Dap & Flip."}
                  </Typography>
                  <Divider sx={{ width: '100%', borderColor: PALETTE.sage, my: 2 }} />

                  {monthlyRevenueLabel(spotlight) && Number(monthlyRevenueLabel(spotlight)) > 0 ? (
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

                  <TrustPoints />

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
                        borderRadius: 1,
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
                          borderRadius: 1,
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
                        disabled={!spotlight._id || isSpotlightOwner}
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
                      borderRadius: "10px",
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
          </CardContent>
        </Card>

        {isMobile && isTablet && (
          <Divider sx={{ borderColor: PALETTE.sage }} />
        )}

        {/* Creator CTA — separate block; spacing won't stretch spotlight image */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 1,
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
                    borderRadius: "10px",
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
        <HowItWorksStepper />

        {/* Full 100% Support */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 1,
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
                    borderRadius: "10px",
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

        {/* Learn / editorial cards — link to static guide pages */}
        <Stack spacing={2}>
          <Stack spacing={0.5} alignItems="center" textAlign="center">
            <Typography
              variant="overline"
              sx={{ fontWeight: 700, color: PALETTE.seafoam }}
            >
              Learn the ropes
            </Typography>
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{ color: PALETTE.charcoal }}
            >
              Guides to help you flip with confidence
            </Typography>
          </Stack>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: { xs: 2, md: 2.5 },
            }}
          >
            {CONTENT_CARDS.map((card) => (
              <Paper
                key={card.href}
                variant="outlined"
                onClick={() => router.push(card.href)}
                sx={{
                  flex: "1 1 340px",
                  minWidth: { xs: "100%", sm: 320 },
                  borderRadius: 1,
                  borderColor: PALETTE.sage,
                  cursor: "pointer",
                  p: { xs: 1.5, md: 2 },
                  transition:
                    "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    borderColor: PALETTE.seafoam,
                    boxShadow: "0 12px 28px rgba(37,52,58,0.12)",
                  },
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ height: "100%" }}
                >
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: { xs: 88, md: 96 },
                      height: { xs: 88, md: 96 },
                      borderRadius: 1,
                      overflow: "hidden",
                      bgcolor: PALETTE.mint,
                      border: `1px solid ${PALETTE.sage}`,
                    }}
                  >
                    <Box
                      component="img"
                      src={card.image}
                      alt={card.title}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </Box>
                  <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, color: "text.secondary" }}
                    >
                      {card.eyebrow}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 800, color: PALETTE.charcoal, lineHeight: 1.25 }}
                    >
                      {card.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.5 }}
                    >
                      {card.description}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Box>
        </Stack>
      </Stack>

      <PlatformSecurityModal
        open={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
      />
    </Container>
  );
}
