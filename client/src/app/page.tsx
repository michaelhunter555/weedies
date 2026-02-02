"use client";
import { useContext, useState } from "react";

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
import Stack from "@mui/material/Stack";
import useTheme from "@mui/material/styles/useTheme";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";

import { Content, PageContainer } from "../components/Footer/FooterStyles";

export default function Home() {
  const auth = useContext(AuthContext);
  const [openCartModal, setOpenCartModal] = useState<boolean>(false);
  const cart = useContext(CartContext);
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
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
    <PageContainer>
      <Content>
        <CartModal open={openCartModal} onClose={handleAddToCartModal} />
        <Container maxWidth="lg" sx={{ marginTop: 5 }}>
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
                sx={{ margin: "0 auto", width: { xs: "100%", md: "50%" } }}
              />
              <StyledStack visible={true} delay={0.1}>
                <FeaturedBanner />
              </StyledStack>
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
                  The Mihe X-900 Fitness Bike
                </StyledText>
                <DirectionsBikeIcon />
              </Stack>
            </Divider>

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
              <Grid
                container
                spacing={2}
                direction={isMobile ? "column" : "row"}
              >
                <Grid size={isMobile ? 12 : 7}>
                  <CardMedia
                    component="img"
                    src={imagePath}
                    alt="featured_image"
                    sx={{
                      width: { xs: "100%", md: "100%" },
                      height: { xs: "100%", md: "100%" },
                      borderRadius: 5,
                      border: "1px solid #b1b1b1",
                    }}
                  />
                </Grid>
                {isMobile && (
                  <StyledStack
                    visible={true}
                    delay={0.3}
                    yAxis={5}
                    direction="row"
                    spacing={1}
                    sx={{ overFlowX: "auto" }}
                  >
                    <ImageList
                      onImageClick={(imagePath: string) =>
                        handleImagePathChange(imagePath)
                      }
                    />
                  </StyledStack>
                )}
                <Divider orientation="vertical" flexItem />
                <Grid size={isMobile ? 12 : 4}>
                  <Stack
                    direction="column"
                    justifyContent="center"
                    sx={{ width: "100%" }}
                    spacing={1}
                  >
                    <StyledText variant="h5">
                      Mihe X-900 Fitness Bike
                    </StyledText>
                    <ProductRatings />
                    <StyledText variant="h4">
                      ${price}.<span style={{ fontSize: 14 }}>00</span>{" "}
                      <s style={{ color: "#b1b1b1" }}>$249.99</s>
                    </StyledText>
                    <ViewCounter />
                    <BenefitsList />
                    <Stack direction="row" spacing={2}>
                      <Alert
                        severity="info"
                        sx={{ borderRadius: 10, paddingTop: 0 }}
                      >
                        This offer is available for store pick-up only.
                      </Alert>
                    </Stack>
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
                      sx={{ borderRadius: 10 }}
                      onClick={handlePhoneCall}
                    >
                      Contact Store
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </StyledStack>

            {!isMobile && (
              <StyledStack
                visible={true}
                delay={0.3}
                yAxis={5}
                direction="row"
                spacing={1}
              >
                <ImageList
                  onImageClick={(imagePath: string) =>
                    handleImagePathChange(imagePath)
                  }
                />
              </StyledStack>
            )}

            {/* Product Tabs (Descriptions, features, warranty can go here) */}
            <ProductTabs />

            <Divider>
              <Stack
                id="highlight"
                direction="row"
                spacing={1}
                alignItems="center"
              >
                <StyledText variant="subtitle2">Highlights</StyledText>
                <AutoAwesomeIcon />
              </Stack>
            </Divider>
            <Stack spacing={2}>
              <HighlightNotes isMobile={isMobile} />
            </Stack>
            <Divider>
              <Stack id="faqs" direction="row" alignItems="center" spacing={1}>
                <StyledText variant="subtitle2">FAQS</StyledText>
                <LiveHelpIcon />
              </Stack>
            </Divider>
            <FaqSection isMobile={isMobile} />
          </Stack>
        </Container>
      </Content>
      <Divider sx={{ margin: "1rem auto", width: "100%" }} />
      {/* Footer */}
      <Stack direction="row" alignItems="center" spacing={2}>
        <Stack>
          <Image src="mihe_logo.svg" alt="mihe-logo" width={100} height={75} />
        </Stack>
        <Stack>
          <Copyright />
        </Stack>
      </Stack>
    </PageContainer>
  );
}
