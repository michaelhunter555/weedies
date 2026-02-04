"use client";
import { useContext, useEffect, useState } from "react";

import Image from "next/image";

import CartModal from "@/components/Cart/CartModal";
import FeaturedBanner from "@/components/FeaturedSection/Banners/FeaturedBanner";
import BenefitsList from "@/components/FeaturedSection/BenefitsList";
import FaqSection from "@/components/FeaturedSection/FAQs/FAQsSection";
import HighlightNotes from "@/components/FeaturedSection/Highlights/PaperBenefits";
import ProductTabs from "@/components/FeaturedSection/ProductTabs/TabsSelector";
import QuantitySelector from "@/components/FeaturedSection/SelectQuantity";
import Copyright from "@/components/Footer/Copyright";
import ImageList from "@/components/ImagesList/ImageList";
import ProductRatings from "@/components/Ratings/Ratings";
import { StyledStack } from "@/components/Shared/FadeIn/StyledFadeIn";
import StyledText from "@/components/Shared/Text/StyledText";
import ShippingMessage from "@/components/ShippingOption/ShippingMessage";
import ViewCounter from "@/components/ViewCounter/ViewCounter";
import { AuthContext } from "@/context/auth-context";
import { CartContext } from "@/context/cart/cart-context";
import { scrollToSection } from "@/utils/sectionScroll";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike";
import LiveHelpIcon from "@mui/icons-material/LiveHelp";
import StoreIcon from "@mui/icons-material/Store";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import useTheme from "@mui/material/styles/useTheme";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";

import ProductCard from "@/components/Products/ProductCard";
import Collection from "@/components/Collections/Collection";
import ParkRoundedIcon from '@mui/icons-material/ParkRounded';
import ReviewsSection from "@/components/Reviews/ReviewsSection";

export default function Home() {
  const auth = useContext(AuthContext);
  const [openCartModal, setOpenCartModal] = useState<boolean>(false);
  const cart = useContext(CartContext);
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const effectiveIsMobile = mounted ? isMobile : false;
  const effectiveIsTablet = mounted ? isTablet : false;
  const [imagePath, setImagePath] = useState<string>("/1.jpg");
  const [price, setPrice] = useState<number>(135);
  const [shipping, setShipping] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);

  const handleImagePathChange = (path: string) => {
    setImagePath(path);
  };

  const handlePhoneCall = () => {
    window.location.href = "tel:410-866-1063";
  };

  const handleQuantity = (action: string) => {
    //when "+" is clicked
    if (action === "increment") {
      setQuantity((prev) => (prev += 1));
      setPrice((prev) => {
        let newPrice: number = prev;
        if (quantity === 1) {
          if (price === 135) {
            return (prev += 100) - 35;
          } else {
            return (prev += 100);
          }
        }
        return (newPrice += 100);
      });
    } else if (action === "decrement") {
      setPrice((prev) => {
        if (quantity > 2) {
          return (prev -= 100);
        }
        return 135;
      });
      setQuantity((prev) => (prev > 1 ? (prev -= 1) : 1));
    }
  };

  const handleAddToCartModal = () => {
    setOpenCartModal((prev) => !prev);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <CartModal open={openCartModal} onClose={handleAddToCartModal} />
      <Stack spacing={2}>
            <Stack alignItems="center" sx={{ width: "100%" }}>
              <Stack alignItems="center" width="100%">
                <StyledText variant="h6">
                  Effective Fitness For an{" "}
                  <Typography
                    component="span"
                    style={{ color: "#3eb9bd", fontSize: isMobile ? 18 : 30 }}
                  >
                    Effective Price.
                  </Typography>
                </StyledText>
              </Stack>

              <Stack>
                <StyledText variant="subtitle2">
                  Keep the calories off this winter without breaking the bank.
                </StyledText>
              </Stack>

              <Stack direction="row" spacing={2} sx={{ margin: "1rem auto" }}>
                <Chip
                  variant="filled"
                  label="Learn more"
                  component="button"
                  onClick={() => scrollToSection("product")}
                />
                <Chip
                  variant="outlined"
                  label="FAQs"
                  component="button"
                  onClick={() => scrollToSection("faqs")}
                />
              </Stack>
              <Divider
                flexItem
                sx={{ margin: "10px auto", width: { xs: "100%", md: "50%" } }}
              />
              <StyledStack visible={true} delay={0.1}>
               
                  <FeaturedBanner />
              
              </StyledStack>
              {/* HomePage Products */}
              <Collection collectionName="Featured Products" />
            </Stack>
            <Divider>
              {/* Product info & Photos */}
              <Stack
                id="product"
                direction={"row"}
                alignItems="center"
                spacing={1}
              >
                <StyledText variant="subtitle2">
                  TODAY'S PROMO OFFER
                </StyledText>
                <ParkRoundedIcon />
              </Stack>
            </Divider>

            {/* FEATURED PRODUCT SECTION */}

            <StyledStack
              visible={true}
              delay={0.1}
              direction="column"
              spacing={3}
            >
              <Alert severity="warning">
                Limited Inventory! Take action to avoid missing out. Get 2 bikes
                for $200!
              </Alert>
              <Grid container spacing={{ xs: 2, md: 3 }} alignItems="stretch">
                {/* Column 1: Image + thumbnails */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: "100%" }}>
                    <Stack spacing={2}>
                      <CardMedia
                        component="img"
                        src={imagePath}
                        alt="featured_image"
                        sx={{
                          width: "100%",
                          height: { xs: 220, md: 280 },
                          objectFit: "cover",
                          borderRadius: 3,
                          border: "1px solid #e5e5e5",
                        }}
                      />

                      {/* Thumbnails: always in the DOM, responsive display to avoid layout/hydration weirdness */}
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                          width: "100%",
                          overflowX: "auto",
                          py: 0.5,
                          display: { xs: "flex", md: "flex" },
                        }}
                      >
                        <ImageList onImageClick={(p: string) => handleImagePathChange(p)} />
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>

                {/* Column 2: Purchase box */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: "100%" }}>
                    <Stack direction="column" sx={{ width: "100%" }} spacing={1.5}>
                      <StyledText variant="h5">Mihe X-900 Fitness Bike</StyledText>
                      <ProductRatings />
                      <StyledText variant="h4">
                        ${price}.<span style={{ fontSize: 14 }}>00</span>{" "}
                        <s style={{ color: "#b1b1b1" }}>$249.99</s>
                      </StyledText>

                      <ViewCounter />

                      <Alert severity="info" sx={{ borderRadius: 3 }}>
                        Store pickup only (9am–5pm).
                      </Alert>

                      <ShippingMessage isShipping={shipping} />

                      <Stack direction="row" alignItems="center">
                        <QuantitySelector
                          quantity={quantity}
                          onQuantity={(action: string) => handleQuantity(action)}
                        />
                      </Stack>

                      <Button
                        endIcon={<StoreIcon />}
                        variant="outlined"
                        sx={{ borderRadius: 2 }}
                        onClick={handlePhoneCall}
                      >
                        Contact Store
                      </Button>
                    </Stack>
                  </Paper>
                </Grid>

                {/* Column 3: Benefits */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: "100%" }}>
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Why you’ll love it
                      </Typography>
                      <BenefitsList />
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </StyledStack>


          </Stack>
            <Divider sx={{ margin: '4rem auto' }} />
            <Stack id="reviews" sx={{ marginTop: 1 }} spacing={2}>
              <ReviewsSection />
            </Stack>
    </Container>
  );
}
