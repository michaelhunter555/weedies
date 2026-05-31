"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AllTransactionsSection } from "@/components/MySettings/AllTransactionsSection";
import { MarketplaceOrdersSection } from "@/components/MySettings/MarketplaceOrdersSection";
import { useAuth } from "@/context/auth-context";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";

export default function OrderHistoryPage() {
  const params = useParams<{ id: string }>();
  const { user, hydrated } = useAuth();
  const [tab, setTab] = useState<"orders" | "transactions">("orders");

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
            <b>Orders</b> shows buy-it-now purchases and sales with exchange links.{" "}
            <b>All transactions</b> is the full payment ledger (fees, payout status, disputes).
          </Typography>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, value: "orders" | "transactions") => setTab(value)}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            minHeight: 42,
            "& .MuiTab-root": { textTransform: "none", fontWeight: 700, minHeight: 42 },
          }}
        >
          <Tab label="Orders" value="orders" />
          <Tab label="All transactions" value="transactions" />
        </Tabs>

        {tab === "orders" ? (
          <MarketplaceOrdersSection userId={sessionUserId} variant="full" />
        ) : (
          <AllTransactionsSection userId={sessionUserId} enabled={tab === "transactions"} />
        )}
      </Stack>
    </Container>
  );
}
