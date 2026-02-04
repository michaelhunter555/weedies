"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BenefitsList from "@/components/FeaturedSection/BenefitsList";
import QuantitySelector from "@/components/FeaturedSection/SelectQuantity";
import ImageList from "@/components/ImagesList/ImageList";
import ProductRatings from "@/components/Ratings/Ratings";
import { StyledStack } from "@/components/Shared/FadeIn/StyledFadeIn";
import StyledText from "@/components/Shared/Text/StyledText";
import ShippingMessage from "@/components/ShippingOption/ShippingMessage";
import ViewCounter from "@/components/ViewCounter/ViewCounter";
import { useCart } from "@/context/cart/cart-context";
import StorefrontIcon from "@mui/icons-material/Storefront";
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
import { Accordion, AccordionDetails, AccordionSummary, Box } from "@mui/material";

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const cart = useCart();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState<{[key: string]: boolean}>({
    description: true,
    shipping: false,
    faqs: false,
  });
  useEffect(() => setMounted(true), []);
  const effectiveIsMobile = mounted ? isMobile : false;

  const product = useMemo(() => {
    // TODO: Replace with a backend fetch by `params.id` once product APIs are implemented.
    return {
      id: params?.id || "product-0",
      name: "Alpine Kush",
      previousPrice: 49.99,
      heroImage: "/1.jpg",
    };
  }, [params?.id]);

  const [imagePath, setImagePath] = useState<string>(product.heroImage);
  const [quantity, setQuantity] = useState<number>(1);
  const [shipping, setShipping] = useState<boolean>(false);

  // Variant/amount price options (mirrors your ProductCard selection)
  const [priceOptions] = useState<{ amount: string; price: number; stock: number }[]>([
    { amount: "3.5g", price: 39.99, stock: 10 },
    { amount: "7g", price: 79.99, stock: 1 },
    { amount: "14g", price: 149.99, stock: 10 },
    { amount: "28g", price: 249.99, stock: 10 },
  ]);
  const [selectedAmount, setSelectedAmount] = useState<string>(priceOptions[0].amount);
  const [selectedUnitPrice, setSelectedUnitPrice] = useState<number>(priceOptions[0].price);
  const selectedStock = useMemo(
    () => priceOptions.find((o) => o.amount === selectedAmount)?.stock ?? 0,
    [priceOptions, selectedAmount]
  );

  const totalPrice = useMemo(
    () => Number((selectedUnitPrice * quantity).toFixed(2)),
    [selectedUnitPrice, quantity]
  );

  const handleAmountClick = (amount: string, price: number) => {
    setSelectedAmount(amount);
    setSelectedUnitPrice(price);
  };

  const handleImagePathChange = (path: string) => {
    setImagePath(path.startsWith("/") ? path : `/${path}`);
  };

  const handleQuantity = (action: string) => {
    setQuantity((prev) => {
      if (action === "increment") return prev + 1;
      if (action === "decrement") return prev > 1 ? prev - 1 : 1;
      return prev;
    });
  };

  const handleAddToCart = () => {
    const numericId = Number(String(product.id).replace(/\D/g, "")) || 1;
    cart.addToCart({
      id: numericId,
      price: totalPrice,
      quantity,
    });
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded((prev) => ({ ...prev, [panel]: isExpanded }));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <StyledStack visible={true} delay={0.1} direction="column" spacing={3}>
        <Stack>
          <Typography variant="h3" fontWeight={800}>
            {product.name}
          </Typography>
          <Typography color="text.secondary">Premium flower • Fresh inventory</Typography>
        </Stack>

        <Alert severity="warning">
          Limited Inventory! Take action to avoid missing out.
        </Alert>

        <Grid container spacing={2} direction={effectiveIsMobile ? "column" : "row"}>
          <Grid size={effectiveIsMobile ? 12 : 7}>
            <CardMedia
              component="img"
              src={imagePath}
              alt="product-image"
              sx={{
                width: "100%",
                height: "100%",
                borderRadius: 5,
                border: "1px solid #b1b1b1",
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

          <Divider orientation="vertical" flexItem />

          <Grid size={effectiveIsMobile ? 12 : 4}>
            <Stack direction="column" justifyContent="center" sx={{ width: "100%" }} spacing={1}>
              <StyledText variant="h5">{product.name}</StyledText>
              <ProductRatings />

              <StyledText variant="h4">
                ${totalPrice}.<span style={{ fontSize: 14 }}>00</span>{" "}
                <s style={{ color: "#b1b1b1" }}>${product.previousPrice.toFixed(2)}</s>
              </StyledText>

              <ViewCounter />
              <BenefitsList />

            

              <Stack direction="column" spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">Select amount</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {priceOptions.map((option) => (
                  <Chip
                    key={option.amount}
                    clickable
                    size="small"
                    label={option.amount}
                    color={selectedAmount === option.amount ? "success" : "default"}
                    variant={selectedAmount === option.amount ? "filled" : "outlined"}
                    onClick={() => handleAmountClick(option.amount, option.price)}
                  />
                ))}
              </Stack>
              </Stack>

              <Alert severity="info" sx={{ borderRadius: 3 }}>
                {selectedStock} in stock • {selectedAmount}
              </Alert>

              <ShippingMessage isShipping={shipping} />

              <Stack direction="row" alignItems="center">
                <QuantitySelector quantity={quantity} onQuantity={handleQuantity} />
              </Stack>

              <Button
                startIcon={<StorefrontIcon />}
                variant="contained"
                color="success"
                sx={{ borderRadius: 2 }}
                onClick={handleAddToCart}
              >
                Add to cart
              </Button>
            </Stack>
          </Grid>
        </Grid>

        {!effectiveIsMobile && (
          <StyledStack visible={true} delay={0.3} yAxis={5} direction="row" spacing={1} sx={{ overflowX: "auto" }}>
            <ImageList onImageClick={handleImagePathChange} />
          </StyledStack>
        )}

        <Divider sx={{ margin: "1rem auto", width: "100%" }} />
        <Box>
        {/* Product Description */}
        <Accordion expanded={expanded.description} onChange={handleAccordionChange("description")}>
            <AccordionSummary>
                <Typography variant="subtitle2" color="text.secondary">Description</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Typography variant="subtitle2" color="text.secondary">Description</Typography>
            </AccordionDetails>
        </Accordion>
        {/* Shipping Policy */}
            <Accordion expanded={expanded.shipping} onChange={handleAccordionChange("shipping")}>
            <AccordionSummary>
                <Typography variant="subtitle2" color="text.secondary">Shipping Information</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Typography variant="subtitle2" color="text.secondary">Shipping Policy goes here</Typography>
            </AccordionDetails>
        </Accordion>
        {/* Product Description */}
        <Accordion expanded={expanded.faqs} onChange={handleAccordionChange("faqs")}>
            <AccordionSummary>
                <Typography variant="subtitle2" color="text.secondary">Reviews</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Typography variant="subtitle2" color="text.secondary">Render reviews</Typography>
            </AccordionDetails>
        </Accordion>
        </Box>
      </StyledStack>
    </Container>
  );
}


