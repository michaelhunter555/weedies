"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DisputeResolvePanel } from "@/components/admin/DisputeResolvePanel";
import { fetchAdminDisputeById } from "@/lib/admin-api";
import {
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_STATUS_LABELS,
  formatDisputeMoney,
} from "@/lib/dispute-labels";
import { useAdminAuth } from "@/context/admin-auth-context";

function str(v: unknown): string {
  return typeof v === "string" ? v : v != null ? String(v) : "";
}

export default function AdminDisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const disputeId = decodeURIComponent(params?.id ?? "").trim();
  const queryClient = useQueryClient();
  const { accessToken, hydrated } = useAdminAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-dispute", disputeId],
    queryFn: () => fetchAdminDisputeById(disputeId),
    enabled: hydrated && !!accessToken && !!disputeId,
  });

  if (!disputeId) {
    return <Alert severity="warning">Missing dispute id.</Alert>;
  }

  if (!hydrated || isLoading) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!accessToken) {
    return <Alert severity="info">Sign in to view disputes.</Alert>;
  }

  if (isError || !data?.dispute) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : "Dispute not found."}
      </Alert>
    );
  }

  const dispute = data.dispute;
  const category = str(dispute.category);
  const status = str(dispute.disputeStatus);
  const desired = str(dispute.desiredAction);
  const canResolve = status !== "closed";
  const amountPaidCents = Number(dispute.amountPaid) || 0;
  const requestedRefundCents = Number(dispute.requestedRefundAmount) || 0;

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 900 }}>
      <Button
        component={Link}
        href="/admin/disputes"
        startIcon={<ArrowBackIcon />}
        sx={{ alignSelf: "flex-start", textTransform: "none" }}
      >
        Back to disputes
      </Button>

      <Box>
        <Typography variant="h5" fontWeight={700}>
          {DISPUTE_CATEGORY_LABELS[category] ?? category}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
          <Chip
            size="small"
            label={DISPUTE_STATUS_LABELS[status] ?? status}
            color={status === "in_review" ? "warning" : "default"}
          />
          {status === "closed" ? (
            <Chip size="small" label={`Decision: ${str(dispute.decision) || "—"}`} />
          ) : null}
        </Stack>
      </Box>

      {data.listing ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Listing
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            {data.listing.appName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Status: {data.listing.status} · {data.listing.saleType}
          </Typography>
          <Button
            component={Link}
            href={`/admin/listings/${encodeURIComponent(data.listing.id)}`}
            size="small"
            sx={{ mt: 1, textTransform: "none" }}
          >
            Review listing
          </Button>
        </Paper>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Parties
        </Typography>
        <Stack spacing={1}>
          <Typography variant="body2">
            <b>Buyer:</b> {data.buyer?.name ?? "—"}
            {data.buyer?.email ? ` · ${data.buyer.email}` : ""}
          </Typography>
          <Typography variant="body2">
            <b>Seller:</b> {data.seller?.name ?? dispute.sellerName ?? "—"}
            {data.seller?.email ? ` · ${data.seller.email}` : ""}
          </Typography>
          <Typography variant="body2">
            <b>Opened by:</b> {str(dispute.initiatorName)} ({str(dispute.initiator)})
          </Typography>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Financials
        </Typography>
        <Stack spacing={0.75}>
          <Typography variant="body2">
            Amount paid:{" "}
            <b>{formatDisputeMoney(amountPaidCents)}</b>
          </Typography>
          <Typography variant="body2">
            Requested:{" "}
            <b>
              {desired === "full_refund"
                ? `Full refund (${formatDisputeMoney(requestedRefundCents || amountPaidCents)})`
                : `Partial ${formatDisputeMoney(requestedRefundCents)}`}
            </b>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Opened {new Date(str(dispute.disputeDate)).toLocaleString()}
          </Typography>
        </Stack>
      </Paper>

      {canResolve ? (
        <DisputeResolvePanel
          disputeId={disputeId}
          amountPaidCents={amountPaidCents}
          requestedRefundCents={requestedRefundCents}
          desiredAction={desired}
          onResolved={async () => {
            await queryClient.invalidateQueries({
              queryKey: ["admin-dispute", disputeId],
            });
            await queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
          }}
        />
      ) : null}

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Explanation
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          {str(dispute.disputeExplanation)}
        </Typography>
      </Paper>

      {str(dispute.sellerResponse) ? (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Seller response
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {str(dispute.sellerResponse)}
          </Typography>
        </Paper>
      ) : null}

      {str(dispute.platformResponse) ? (
        <Alert severity="info">
          <Typography variant="subtitle2" fontWeight={700}>
            Platform
          </Typography>
          {str(dispute.platformResponse)}
        </Alert>
      ) : null}

      {(str(dispute.imageOne) || str(dispute.imageTwo)) && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Evidence
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {[dispute.imageOne, dispute.imageTwo]
              .map((u) => str(u))
              .filter(Boolean)
              .map((url) => (
                <Box
                  key={url}
                  component="a"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Box
                    component="img"
                    src={url}
                    alt="Evidence"
                    sx={{
                      width: 160,
                      height: 160,
                      objectFit: "cover",
                      borderRadius: 2,
                      border: 1,
                      borderColor: "divider",
                    }}
                  />
                </Box>
              ))}
          </Stack>
        </Paper>
      )}

      <Divider />
      <Typography variant="caption" color="text.secondary">
        Dispute ID: {disputeId} · Transaction: {str(dispute.transactionId)}
      </Typography>
    </Stack>
  );
}
