"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { useAuth } from "@/context/auth-context";
import { useDisputes } from "@/hooks/use-disputes";
import {
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_STATUS_LABELS,
  formatDisputeMoney,
} from "@/lib/dispute-labels";
import { BRAND_PALETTE } from "@/theme/brand-palette";
import type { DisputeRecord } from "../../../../types";

function statusChipColor(
  status: DisputeRecord["disputeStatus"],
): "default" | "warning" | "info" | "success" {
  if (status === "closed") return "success";
  if (status === "in_review") return "info";
  if (status.startsWith("awaiting")) return "warning";
  return "default";
}

export default function ResolutionCenterPage() {
  const params = useParams<{ id: string }>();
  const { user, hydrated } = useAuth();
  const { listDisputes } = useDisputes();

  const routeUserId = params?.id ? decodeURIComponent(String(params.id)).trim() : "";
  const sessionUserId = user?.id ? String(user.id).trim() : "";
  const base = sessionUserId
    ? `/my-settings/${encodeURIComponent(sessionUserId)}/resolution-center`
    : "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["disputes", sessionUserId],
    queryFn: () => listDisputes({ userId: sessionUserId, page: 1, limit: 24 }),
    enabled: Boolean(hydrated && sessionUserId && routeUserId === sessionUserId),
  });

  if (!hydrated) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Alert severity="warning">Log in to view disputes.</Alert>
    );
  }

  if (routeUserId && sessionUserId && routeUserId !== sessionUserId) {
    return (
      <Alert severity="info">
        Open Resolution center from your own account settings.
      </Alert>
    );
  }

  const disputes = data?.disputes ?? [];

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Resolution center
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Disputes opened after a sale. Buyers can request refunds; sellers can accept
          or escalate for platform review.
        </Typography>
      </Box>

      {isLoading && (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error">
          {error instanceof Error ? error.message : "Could not load disputes."}
        </Alert>
      )}

      {!isLoading && !isError && disputes.length === 0 && (
        <Paper
          variant="outlined"
          sx={{ p: 4, borderRadius: 3, borderColor: BRAND_PALETTE.borderSubtle, textAlign: "center" }}
        >
          <Typography variant="body1" color="text.secondary">
            No disputes yet. If something goes wrong after a purchase, open a dispute
            from the exchange room on that order.
          </Typography>
        </Paper>
      )}

      {!isLoading &&
        disputes.map((d) => {
          const youAreSeller = String(d.sellerId) === sessionUserId;
          return (
            <Paper
              key={d.id}
              component={Link}
              href={`${base}/${encodeURIComponent(d.id)}`}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 3,
                borderColor: BRAND_PALETTE.borderSubtle,
                textDecoration: "none",
                color: "inherit",
                display: "block",
                "&:hover": { borderColor: BRAND_PALETTE.seafoam, bgcolor: "action.hover" },
              }}
            >
              <Stack direction="row" alignItems="flex-start" spacing={1}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 0.5 }}>
                    <Chip
                      size="small"
                      label={DISPUTE_STATUS_LABELS[d.disputeStatus]}
                      color={statusChipColor(d.disputeStatus)}
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                    <Chip
                      size="small"
                      label={youAreSeller ? "You are the seller" : "You are the buyer"}
                      variant="outlined"
                    />
                  </Stack>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {DISPUTE_CATEGORY_LABELS[d.category]}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {d.disputeExplanation}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                    {formatDisputeMoney(d.amountPaid)} paid
                    {d.desiredAction === "partial_refund" && d.requestedRefundAmount
                      ? ` · refund requested ${formatDisputeMoney(d.requestedRefundAmount)}`
                      : d.desiredAction === "full_refund"
                        ? " · full refund requested"
                        : ""}
                  </Typography>
                </Box>
                <ChevronRightRoundedIcon color="action" />
              </Stack>
            </Paper>
          );
        })}
    </Stack>
  );
}
