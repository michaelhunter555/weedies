"use client";
import { useEffect, useState } from "react";

import CartModal from "@/components/Cart/CartModal";
import BenefitsList from "@/components/FeaturedSection/BenefitsList";
import Collection from "@/components/Collections/Collection";
import ImageList from "@/components/ImagesList/ImageList";
import ProductRatings from "@/components/Ratings/Ratings";
import ReviewsSection from "@/components/Reviews/ReviewsSection";
import { StyledStack } from "@/components/Shared/FadeIn/StyledFadeIn";
import StyledText from "@/components/Shared/Text/StyledText";
import ViewCounter from "@/components/ViewCounter/ViewCounter";
import { scrollToSection } from "@/utils/sectionScroll";

import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ExtensionRoundedIcon from "@mui/icons-material/ExtensionRounded";
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useTheme from "@mui/material/styles/useTheme";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useRouter } from "next/navigation";

const HERO_CATEGORIES = [
  { label: "AI Tools", icon: <AutoAwesomeIcon fontSize="small" />, value: "ai-tools" },
  { label: "Productivity", icon: <BoltRoundedIcon fontSize="small" />, value: "productivity" },
  { label: "Games", icon: <SportsEsportsRoundedIcon fontSize="small" />, value: "games" },
  { label: "Dev Tools", icon: <TerminalRoundedIcon fontSize="small" />, value: "dev-tools" },
  { label: "Design", icon: <PaletteRoundedIcon fontSize="small" />, value: "design" },
  { label: "Extensions", icon: <ExtensionRoundedIcon fontSize="small" />, value: "extensions" },
];

export default function Home() {
  const router = useRouter();
  const [openCartModal, setOpenCartModal] = useState<boolean>(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [imagePath, setImagePath] = useState<string>("/5.jpg");
  const [query, setQuery] = useState<string>("");

  const handleImagePathChange = (path: string) => setImagePath(path);

  const handleSearch = () => {
    if (query.trim().length === 0) {
      router.push("/products");
      return;
    }
    router.push(`/products?q=${encodeURIComponent(query.trim())}`);
  };

  const handleAddToCartModal = () => setOpenCartModal((prev) => !prev);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <CartModal open={openCartModal} onClose={handleAddToCartModal} />

      {/* HERO */}
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 5,
          px: { xs: 3, md: 6 },
          py: { xs: 5, md: 7 },
          color: "#fff",
          background:
            "radial-gradient(1200px 400px at 10% 0%, rgba(236,72,153,0.35), transparent 60%)," +
            "radial-gradient(800px 400px at 90% 100%, rgba(245,158,11,0.35), transparent 60%)," +
            "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #4c1d95 100%)",
        }}
      >
        <Stack spacing={2} sx={{ maxWidth: 720 }}>
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: 16, color: "#fde68a !important" }} />}
            label="New · 120+ apps added this week"
            size="small"
            sx={{
              width: "fit-content",
              backgroundColor: "rgba(255,255,255,0.12)",
              color: "#fde68a",
              border: "1px solid rgba(255,255,255,0.18)",
              fontWeight: 600,
            }}
          />
          <Typography
            variant={isMobile ? "h4" : "h3"}
            sx={{ fontWeight: 900, lineHeight: 1.1 }}
          >
            The marketplace for{" "}
            <Box
              component="span"
              sx={{
                background: "linear-gradient(90deg, #fda4af 0%, #fcd34d 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              vibecoded apps
            </Box>
            .
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ color: "rgba(255,255,255,0.8)", maxWidth: 560 }}
          >
            Discover apps shipped by indie builders — or list the one you
            vibecoded this weekend and start earning.
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ mt: 1, width: "100%", maxWidth: 620 }}
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
                  backgroundColor: "rgba(255,255,255,0.95)",
                  px: 1,
                },
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ color: "text.secondary" }} />
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
                background:
                  "linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)",
                boxShadow: "none",
                whiteSpace: "nowrap",
              }}
            >
              Explore
            </Button>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{ flexWrap: "wrap", gap: 1, mt: 1 }}
          >
            {HERO_CATEGORIES.map((c) => (
              <Chip
                key={c.value}
                icon={c.icon}
                clickable
                label={c.label}
                onClick={() => router.push(`/products?category=${c.value}`)}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.2)",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.18)" },
                  "& .MuiChip-icon": { color: "#fff" },
                }}
              />
            ))}
          </Stack>

          <Stack
            direction="row"
            spacing={3}
            sx={{ mt: 2, color: "rgba(255,255,255,0.85)" }}
          >
            <Stack>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                3,240+
              </Typography>
              <Typography variant="caption">apps listed</Typography>
            </Stack>
            <Divider
              orientation="vertical"
              flexItem
              sx={{ borderColor: "rgba(255,255,255,0.2)" }}
            />
            <Stack>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                180k
              </Typography>
              <Typography variant="caption">monthly installs</Typography>
            </Stack>
            <Divider
              orientation="vertical"
              flexItem
              sx={{ borderColor: "rgba(255,255,255,0.2)" }}
            />
            <Stack>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                $1.2M
              </Typography>
              <Typography variant="caption">paid to creators</Typography>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      <Stack spacing={5} sx={{ mt: 5 }}>
        {/* Featured collections */}
        <Collection
          collectionName="Trending this week"
          subtitle="What the community is vibing with right now."
          count={8}
        />

        <Collection
          collectionName="Fresh drops"
          subtitle="Just shipped by indie builders."
          category="new"
          count={8}
        />

        <Divider>
          <Stack id="product" direction="row" alignItems="center" spacing={1}>
            <StyledText variant="subtitle2">APP OF THE DAY</StyledText>
            <RocketLaunchRoundedIcon fontSize="small" />
          </Stack>
        </Divider>

        {/* FEATURED APP SECTION */}
        <StyledStack visible={true} delay={0.1} direction="column" spacing={3}>
          <Alert severity="info" sx={{ borderRadius: 3 }}>
            Launch offer — get the lifetime license for PromptForge at 40% off
            this week only.
          </Alert>
          <Grid container spacing={{ xs: 2, md: 3 }} alignItems="stretch">
            {/* Column 1: Hero image + thumbs */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 3, height: "100%" }}
              >
                <Stack spacing={2}>
                  <CardMedia
                    component="img"
                    src={imagePath}
                    alt="featured_app_screenshot"
                    sx={{
                      width: "100%",
                      height: { xs: 220, md: 280 },
                      objectFit: "cover",
                      borderRadius: 3,
                      border: "1px solid #e5e5e5",
                    }}
                  />
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      width: "100%",
                      overflowX: "auto",
                      py: 0.5,
                    }}
                  >
                    <ImageList onImageClick={handleImagePathChange} />
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            {/* Column 2: App meta + buy box */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 3, height: "100%" }}
              >
                <Stack sx={{ width: "100%" }} spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label="AI Tools"
                      size="small"
                      color="secondary"
                      sx={{ fontWeight: 700 }}
                    />
                    <Chip
                      icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                      label="Pro"
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  </Stack>
                  <StyledText variant="h5">PromptForge</StyledText>
                  <Typography variant="body2" color="text.secondary">
                    by <b>@zane</b> · Verified creator
                  </Typography>
                  <ProductRatings />
                  <StyledText variant="h4">
                    $19<span style={{ fontSize: 14 }}>/mo</span>{" "}
                    <s style={{ color: "#b1b1b1", fontSize: 18 }}>$32</s>
                  </StyledText>

                  <ViewCounter />

                  <Stack direction="row" spacing={1}>
                    <Chip
                      size="small"
                      icon={<DownloadRoundedIcon sx={{ fontSize: 14 }} />}
                      label="12.4k installs"
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      icon={<BoltRoundedIcon sx={{ fontSize: 14 }} />}
                      label="Instant access"
                      variant="outlined"
                    />
                  </Stack>

                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<RocketLaunchRoundedIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      background:
                        "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                      boxShadow: "none",
                      fontWeight: 700,
                    }}
                    onClick={() => router.push("/products/app-featured")}
                  >
                    Get PromptForge
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<StorefrontRoundedIcon />}
                    sx={{ borderRadius: 2, textTransform: "none" }}
                    onClick={() => router.push("/products/app-featured")}
                  >
                    View app page
                  </Button>
                </Stack>
              </Paper>
            </Grid>

            {/* Column 3: Why creators love VibeStack */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 3, height: "100%" }}
              >
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Why builders ship on VibeStack
                  </Typography>
                  <BenefitsList />
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </StyledStack>

        {/* Creator CTA */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            p: { xs: 3, md: 5 },
            background:
              "linear-gradient(135deg, #fdf4ff 0%, #fef3c7 100%)",
            border: "1px solid #f5d0fe",
          }}
        >
          <Grid container alignItems="center" spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="overline" color="secondary" fontWeight={700}>
                For creators
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                Shipped something this weekend? List it in 5 minutes.
              </Typography>
              <Typography color="text.secondary">
                Keep 90% of revenue. Built-in payments, licenses and reviews —
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
                    background:
                      "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                    boxShadow: "none",
                  }}
                >
                  List your app
                </Button>
                <Chip
                  label="Takes 5 min · no code review"
                  size="small"
                  variant="outlined"
                  onClick={() => scrollToSection("reviews")}
                />
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        <Divider />

        <Stack id="reviews" spacing={2}>
          <ReviewsSection />
        </Stack>
      </Stack>
    </Container>
  );
}
