"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useAuth } from "@/context/auth-context";
import { useDisputes } from "@/hooks/use-disputes";
import {
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_STATUS_LABELS,
  formatDisputeMoney,
} from "@/lib/dispute-labels";
import { brandContainedButtonSx } from "@/theme/brand-palette";

export default function DisputeDetailPage() {
  const params = useParams<{ id: string; disputeId: string }>();
  const queryClient = useQueryClient();
  const { user, hydrated } = useAuth();
  const { getDispute, respondToDispute } = useDisputes();

  const sessionUserId = user?.id ? String(user.id).trim() : "";
  const disputeId = params?.disputeId
    ? decodeURIComponent(String(params.disputeId)).trim()
    : "";
  const listHref = sessionUserId
    ? `/my-settings/${encodeURIComponent(sessionUserId)}/resolution-center`
    : "/";

  const [sellerResponse, setSellerResponse] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dispute", disputeId],
    queryFn: () => getDispute(disputeId),
    enabled: Boolean(hydrated && disputeId),
  });

  const respondMutation = useMutation({
    mutationFn: (action: "accept" | "escalate") =>
      respondToDispute(disputeId, {
        action,
        sellerResponse: action === "escalate" ? sellerResponse.trim() : undefined,
      }),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["dispute", disputeId] });
      await queryClient.invalidateQueries({ queryKey: ["disputes", sessionUserId] });
    },
    onError: (e: Error) => setActionError(e.message),
  });

  if (!hydrated || isLoading) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data?.dispute) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : "Dispute not found."}
      </Alert>
    );
  }

  const { dispute, role, listing } = data;
  const canSellerRespond =
    role === "seller" &&
    dispute.disputeStatus !== "closed" &&
    dispute.disputeStatus === "awaiting_seller_response";

  const listingHref =
    listing?.slug
      ? `/products/${encodeURIComponent(listing.id)}/${encodeURIComponent(listing.slug)}`
      : listing
        ? `/products/${encodeURIComponent(listing.id)}`
        : null;

  return (
    <Stack spacing={2}>
      <Button
        component={Link}
        href={listHref}
        startIcon={<ArrowBackRoundedIcon />}
        sx={{ alignSelf: "flex-start", textTransform: "none" }}
        color="inherit"
      >
        Back to Resolution center
      </Button>

      <Box>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          {DISPUTE_CATEGORY_LABELS[dispute.category]}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
          <Chip
            label={DISPUTE_STATUS_LABELS[dispute.disputeStatus]}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
          <Chip
            label={role === "seller" ? "You are the seller" : "You are the buyer"}
            size="small"
            variant="outlined"
          />
        </Stack>
      </Box>

      {listing && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Listing
          </Typography>
          <Typography variant="h6" fontWeight={800}>
            {listing.appName}
          </Typography>
          {listingHref && (
            <Button
              component={Link}
              href={listingHref}
              size="small"
              sx={{ mt: 1, textTransform: "none" }}
            >
              View listing
            </Button>
          )}
          <Button
            component={Link}
            href={`/exchange/${encodeURIComponent(listing.id)}`}
            size="small"
            sx={{ mt: 1, ml: 1, textTransform: "none" }}
          >
            Exchange room
          </Button>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Summary
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
          {dispute.disputeExplanation}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Stack spacing={0.75}>
          <Typography variant="body2">
            Amount paid: <b>{formatDisputeMoney(dispute.amountPaid)}</b>
          </Typography>
          <Typography variant="body2">
            Requested outcome:{" "}
            <b>
              {dispute.desiredAction === "full_refund"
                ? "Full refund"
                : `Partial refund (${formatDisputeMoney(dispute.requestedRefundAmount ?? 0)})`}
            </b>
          </Typography>
          <Typography variant="body2">
            Opened by: <b>{dispute.initiatorName}</b> ({dispute.initiator})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Opened {new Date(dispute.disputeDate).toLocaleString()}
          </Typography>
        </Stack>
      </Paper>

      {(dispute.imageOne || dispute.imageTwo) && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Evidence
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {[dispute.imageOne, dispute.imageTwo]
              .filter(Boolean)
              .map((url) => (
                <Box
                  key={url}
                  component="img"
                  src={url}
                  alt="Dispute evidence"
                  sx={{
                    width: 120,
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
              ))}
          </Stack>
        </Paper>
      )}

      {dispute.sellerResponse ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Seller response
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {dispute.sellerResponse}
          </Typography>
        </Paper>
      ) : null}

      {dispute.platformResponse ? (
        <Alert severity="info">
          <Typography variant="subtitle2" fontWeight={700}>
            Platform
          </Typography>
          {dispute.platformResponse}
        </Alert>
      ) : null}

      {canSellerRespond && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight={800} gutterBottom>
            Seller actions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Accept to issue the requested refund through Stripe immediately. Escalate only
            if you disagree — that sends the case to platform review.
          </Typography>
          <TextField
            label="Your response (required to escalate)"
            multiline
            minRows={3}
            fullWidth
            value={sellerResponse}
            onChange={(e) => setSellerResponse(e.target.value)}
            sx={{ mb: 2 }}
          />
          {actionError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {actionError}
            </Alert>
          )}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              variant="contained"
              disabled={respondMutation.isPending}
              onClick={() => respondMutation.mutate("accept")}
              sx={{ textTransform: "none", fontWeight: 700, ...brandContainedButtonSx }}
            >
              Accept and refund
            </Button>
            <Button
              variant="outlined"
              disabled={
                respondMutation.isPending || sellerResponse.trim().length < 10
              }
              onClick={() => respondMutation.mutate("escalate")}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Respond and escalate
            </Button>
          </Stack>
        </Paper>
      )}

      {role === "buyer" && dispute.disputeStatus === "awaiting_seller_response" && (
        <Alert severity="info">
          Waiting for the seller to accept your request or respond. You will be notified
          when the status changes.
        </Alert>
      )}
    </Stack>
  );
}
