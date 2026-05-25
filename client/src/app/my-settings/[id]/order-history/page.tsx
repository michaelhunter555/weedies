"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { MarketplaceOrdersSection } from "@/components/MySettings/MarketplaceOrdersSection";
import { useAuth } from "@/context/auth-context";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";

export default function OrderHistoryPage() {
  const params = useParams<{ id: string }>();
  const { user, hydrated } = useAuth();

  const routeUserId = params?.id ? decodeURIComponent(String(params.id)).trim() : "";
  const sessionUserId = user?.id ? String(user.id).trim() : "";

  if (!hydrated) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Log in to see your purchases and sales.
        </Alert>
        <Button component={Link} href="/signup" variant="contained" sx={{ textTransform: "none" }}>
          Sign in
        </Button>
      </Container>
    );
  }

  if (routeUserId && sessionUserId && routeUserId !== sessionUserId) {
    const correct = `/my-settings/${encodeURIComponent(sessionUserId)}/order-history`;
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Order history is tied to your signed-in account. Open your own orders page to see
          purchases and exchange links.
        </Alert>
        <Button component={Link} href={correct} variant="contained" sx={{ textTransform: "none" }}>
          Go to my orders
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Orders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Buy-it-now purchases and completed sales. Each row links to the product page and the
            post-sale exchange room.
          </Typography>
        </Box>
        <MarketplaceOrdersSection userId={sessionUserId} variant="full" />
      </Stack>
    </Container>
  );
}
