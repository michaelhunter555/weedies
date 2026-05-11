"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import ImageList from "@/components/ImagesList/ImageList";
import ProductRatings from "@/components/Ratings/Ratings";
import { StyledStack } from "@/components/Shared/FadeIn/StyledFadeIn";
import StyledText from "@/components/Shared/Text/StyledText";
import ViewCounter from "@/components/ViewCounter/ViewCounter";
import { useCart } from "@/context/cart/cart-context";

import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  CardMedia,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import useTheme from "@mui/material/styles/useTheme";

type Tier = {
  id: string;
  name: string;
  price: number;
  billing: "month" | "one-time" | "free";
  features: string[];
};

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const cart = useCart();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState<{ [k: string]: boolean }>({
    description: true,
    features: true,
    changelog: false,
    faqs: false,
  });
  useEffect(() => setMounted(true), []);
  const effectiveIsMobile = mounted ? isMobile : false;

  const app = useMemo(() => {
    return {
      id: params?.id || "app-featured",
      name: "PromptForge",
      tagline: "Build, test & ship AI prompts in seconds.",
      creator: "@zane",
      category: "AI Tools",
      heroImage: "/5.jpg",
      previousPrice: 32,
      verified: true,
      description:
        "PromptForge is a playground and version-control system for AI prompts. Fork prompts from the community, A/B test variants against your own test cases, and deploy the winners as versioned endpoints your app can call.",
    };
  }, [params?.id]);

  const [imagePath, setImagePath] = useState<string>(app.heroImage);

  const tiers: Tier[] = [
    {
      id: "free",
      name: "Free",
      price: 0,
      billing: "free",
      features: ["Up to 20 prompts", "Community library", "1 test case per prompt"],
    },
    {
      id: "pro",
      name: "Pro",
      price: 19,
      billing: "month",
      features: ["Unlimited prompts", "Unlimited tests", "Deploy as API", "Priority support"],
    },
    {
      id: "lifetime",
      name: "Lifetime",
      price: 149,
      billing: "one-time",
      features: ["Everything in Pro", "Lifetime updates", "Commercial license"],
    },
  ];
  const [selectedTier, setSelectedTier] = useState<string>("pro");
  const currentTier = tiers.find((t) => t.id === selectedTier) || tiers[1];

  const handleImagePathChange = (path: string) => {
    setImagePath(path.startsWith("/") ? path : `/${path}`);
  };

  const handleInstall = () => {
    const numericId = Number(String(app.id).replace(/\D/g, "")) || 1;
    cart.addToCart({
      id: numericId,
      price: currentTier.price,
      quantity: 1,
    });
  };

  const handleAccordion =
    (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded((prev) => ({ ...prev, [panel]: isExpanded }));
    };

  const priceLabel =
    currentTier.billing === "free"
      ? "Free"
      : currentTier.billing === "month"
      ? `$${currentTier.price}/mo`
      : `$${currentTier.price}`;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <StyledStack visible={true} delay={0.1} direction="column" spacing={3}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip label={app.category} size="small" color="secondary" sx={{ fontWeight: 700 }} />
          <Chip
            label="Top 1% this week"
            size="small"
            variant="outlined"
            icon={<BoltRoundedIcon sx={{ fontSize: 14 }} />}
          />
        </Stack>

        <Stack>
          <Typography variant="h3" fontWeight={900}>
            {app.name}
          </Typography>
          <Typography variant="h6" color="text.secondary" fontWeight={500}>
            {app.tagline}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
            <Avatar sx={{ width: 26, height: 26, bgcolor: "#7c3aed", fontSize: 12 }}>
              {app.creator.slice(1, 2).toUpperCase()}
            </Avatar>
            <Typography variant="body2">by <b>{app.creator}</b></Typography>
            {app.verified && (
              <Chip
                size="small"
                icon={<VerifiedRoundedIcon sx={{ fontSize: 14 }} />}
                label="Verified creator"
                color="success"
                variant="outlined"
              />
            )}
          </Stack>
        </Stack>

        <Grid container spacing={2} direction={effectiveIsMobile ? "column" : "row"}>
          <Grid size={effectiveIsMobile ? 12 : 7}>
            <CardMedia
              component="img"
              src={imagePath}
              alt="app-screenshot"
              sx={{
                width: "100%",
                height: { xs: 260, md: 420 },
                objectFit: "cover",
                borderRadius: 4,
                border: "1px solid #ececec",
              }}
            />
          </Grid>

          {effectiveIsMobile && (
            <StyledStack
              visible={true}
              delay={0.3}
              yAxis={5}
              direction="row"
              spacing={1}
              sx={{ overflowX: "auto" }}
            >
              <ImageList onImageClick={handleImagePathChange} />
            </StyledStack>
          )}

          <Grid size={effectiveIsMobile ? 12 : 5}>
            <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5, height: "100%" }}>
              <Stack spacing={1.5}>
                <StyledText variant="h5">{app.name}</StyledText>
                <ProductRatings />

                <Stack direction="row" alignItems="baseline" spacing={1}>
                  <StyledText variant="h4">{priceLabel}</StyledText>
                  {currentTier.price > 0 && (
                    <Typography color="text.secondary">
                      <s>${app.previousPrice}</s>
                    </Typography>
                  )}
                </Stack>

                <ViewCounter />

                <Stack direction="row" spacing={1}>
                  <Chip
                    size="small"
                    variant="outlined"
                    icon={<DownloadRoundedIcon sx={{ fontSize: 14 }} />}
                    label="12.4k installs"
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    icon={<BoltRoundedIcon sx={{ fontSize: 14 }} />}
                    label="Instant access"
                  />
                </Stack>

                <Divider sx={{ my: 1 }} />

                <Typography variant="subtitle2" color="text.secondary">
                  Choose a license
                </Typography>
                <Stack spacing={1}>
                  {tiers.map((t) => {
                    const selected = t.id === selectedTier;
                    return (
                      <Paper
                        key={t.id}
                        variant="outlined"
                        onClick={() => setSelectedTier(t.id)}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          cursor: "pointer",
                          borderColor: selected
                            ? "rgba(124,58,237,0.7)"
                            : "#ececec",
                          background: selected
                            ? "linear-gradient(135deg, #faf5ff 0%, #fdf2f8 100%)"
                            : "#fff",
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography fontWeight={700}>{t.name}</Typography>
                              {t.id === "pro" && (
                                <Chip
                                  label="Popular"
                                  size="small"
                                  color="secondary"
                                  icon={<AutoAwesomeIcon sx={{ fontSize: 12 }} />}
                                  sx={{ height: 20, fontSize: 10 }}
                                />
                              )}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {t.features.slice(0, 2).join(" · ")}
                            </Typography>
                          </Stack>
                          <Typography fontWeight={800}>
                            {t.billing === "free"
                              ? "Free"
                              : t.billing === "month"
                              ? `$${t.price}/mo`
                              : `$${t.price}`}
                          </Typography>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>

                <Button
                  onClick={handleInstall}
                  variant="contained"
                  size="large"
                  endIcon={<RocketLaunchRoundedIcon />}
                  sx={{
                    mt: 1,
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    background:
                      "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                    boxShadow: "none",
                  }}
                >
                  {currentTier.billing === "free" ? "Install for free" : `Get ${currentTier.name}`}
                </Button>

                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  Secure checkout. 14-day refund on paid licenses.
                </Alert>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {!effectiveIsMobile && (
          <StyledStack
            visible={true}
            delay={0.3}
            yAxis={5}
            direction="row"
            spacing={1}
            sx={{ overflowX: "auto" }}
          >
            <ImageList onImageClick={handleImagePathChange} />
          </StyledStack>
        )}

        <Divider sx={{ my: 1, width: "100%" }} />

        <Box>
          <Accordion
            expanded={expanded.description}
            onChange={handleAccordion("description")}
          >
            <AccordionSummary>
              <Typography fontWeight={700}>About this app</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="text.secondary">{app.description}</Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded.features}
            onChange={handleAccordion("features")}
          >
            <AccordionSummary>
              <Typography fontWeight={700}>What's included</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                {currentTier.features.map((f) => (
                  <Stack
                    key={f}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                  >
                    <CheckRoundedIcon color="success" fontSize="small" />
                    <Typography color="text.secondary">{f}</Typography>
                  </Stack>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded.changelog}
            onChange={handleAccordion("changelog")}
          >
            <AccordionSummary>
              <Typography fontWeight={700}>Changelog</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                <Typography variant="body2">
                  <b>v1.4.0</b> — Added multi-model A/B testing.
                </Typography>
                <Typography variant="body2">
                  <b>v1.3.2</b> — New dark theme, fixed import bug.
                </Typography>
                <Typography variant="body2">
                  <b>v1.3.0</b> — Prompt version history.
                </Typography>
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Accordion expanded={expanded.faqs} onChange={handleAccordion("faqs")}>
            <AccordionSummary>
              <Typography fontWeight={700}>FAQs</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  <b>Can I cancel anytime?</b> — Yes, Pro is monthly and
                  cancellable anytime.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <b>Does it include source code?</b> — Only the Lifetime license
                  includes full source access.
                </Typography>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Box>
      </StyledStack>
    </Container>
  );
}
