"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { useListings } from "@/hooks/use-listings";
import { brandContainedButtonSx } from "@/theme/brand-palette";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

export default function CheckoutSuccessPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, hydrated } = useAuth();
  const { getListing } = useListings();
  const pollStartedAt = useRef(Date.now());
  const [exchangeGateOpen, setExchangeGateOpen] = useState(false);

  const listingId = decodeURIComponent(params?.id ?? "").trim();
  const sessionId = searchParams?.get("session_id")?.trim() ?? "";
  const isEscrowSuccess = searchParams?.get("escrow") === "1";

  useEffect(() => {
    pollStartedAt.current = Date.now();
    setExchangeGateOpen(false);
    if (!listingId) return;
    const t = window.setTimeout(() => setExchangeGateOpen(true), 120_000);
    return () => clearTimeout(t);
  }, [listingId]);

  const { data: listing, isFetching } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => getListing(listingId),
    enabled: listingId.length > 0,
    staleTime: 0,
    refetchInterval: (query) => {
      if (query.state.status === "error") return false;
      if (query.state.data?.status === "sold") return false;
      if (Date.now() - pollStartedAt.current > 120_000) return false;
      return 2500;
    },
  });

  const saleReady = listing?.status === "sold";
  const canOpenExchange = saleReady || exchangeGateOpen || isEscrowSuccess;
  const exchangeHref =
    listingId.length > 0 ? `/exchange/${encodeURIComponent(listingId)}` : "/products";

  const listingSlug =
    typeof listing?.slug === "string" && listing.slug.trim() ? listing.slug.trim() : "";
  const listingProductHref =
    listingId.length > 0
      ? listingSlug
        ? `/products/${encodeURIComponent(listingId)}/${encodeURIComponent(listingSlug)}`
        : `/products/${encodeURIComponent(listingId)}`
      : "/products";

  const ordersHref =
    hydrated && user?.id
      ? `/my-settings/${encodeURIComponent(String(user.id))}/order-history`
      : undefined;

  useEffect(() => {
    if (!saleReady || !listingId) return;
    void queryClient.invalidateQueries({ queryKey: ["my-marketplace-orders"] });
    void queryClient.invalidateQueries({ queryKey: ["my-transactions"] });
  }, [saleReady, listingId, queryClient]);

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3 }}>
        <Stack spacing={2.5} alignItems="flex-start">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CheckCircleRoundedIcon color="success" sx={{ fontSize: 36 }} />
            <Typography variant="h5" fontWeight={800}>
              {isEscrowSuccess ? "Escrow started" : "Payment submitted"}
            </Typography>
          </Stack>
          {isEscrowSuccess ? (
            <Typography variant="body1" color="text.secondary">
              Your Escrow.com transaction is started. Check your inbox for an email to agree on
              terms and fund the purchase. We will update this order when Escrow confirms payment.
            </Typography>
          ) : (
            <Typography variant="body1" color="text.secondary">
              Stripe has authorized your payment. The marketplace will mark this listing as sold in
              a few seconds; you can open the exchange room once that finishes. Capture still
              happens on the usual schedule. The room is for handover and confirmation with the
              seller.
            </Typography>
          )}
          {!isEscrowSuccess && !saleReady && listingId ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary" }}>
              {isFetching ? <CircularProgress size={18} /> : null}
              <Typography variant="body2" color="text.secondary">
                {isFetching
                  ? "Checking sale status…"
                  : exchangeGateOpen
                    ? "This page still does not show the listing as sold. You can try the exchange room anyway; if it errors, wait a few seconds and refresh."
                    : "Waiting for the server to record your purchase…"}
              </Typography>
            </Stack>
          ) : null}
          {isEscrowSuccess && !saleReady ? (
            <Typography variant="body2" color="text.secondary">
              The exchange room opens after Escrow payment is received and the listing is marked
              sold.
            </Typography>
          ) : null}
          <Button
            component={Link}
            href={exchangeHref}
            variant="contained"
            size="large"
            endIcon={<ArrowForwardRoundedIcon />}
            disabled={!listingId || !canOpenExchange}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              ...brandContainedButtonSx,
              boxShadow: "none",
            }}
          >
            Visit exchange &amp; settlement for this listing
          </Button>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: "100%" }}>
            <Button
              component={Link}
              href={listingProductHref}
              variant="outlined"
              size="medium"
              disabled={!listingId}
              endIcon={<OpenInNewRoundedIcon />}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              View listing
            </Button>
            {ordersHref ? (
              <Button
                component={Link}
                href={ordersHref}
                variant="outlined"
                size="medium"
                startIcon={<ReceiptLongRoundedIcon />}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Orders &amp; receipts
              </Button>
            ) : null}
          </Stack>
          <Button component={Link} href="/products" variant="text" color="inherit" sx={{ fontWeight: 600 }}>
            Back to marketplace
          </Button>
          {sessionId ? (
            <Box sx={{ width: "100%", pt: 1, borderTop: 1, borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary" component="p" sx={{ wordBreak: "break-all" }}>
                Checkout session (for support): {sessionId}
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </Paper>
    </Container>
  );
}
