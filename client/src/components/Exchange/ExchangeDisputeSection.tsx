"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useAuth } from "@/context/auth-context";
import { useDisputes } from "@/hooks/use-disputes";
import { DISPUTE_CATEGORY_LABELS } from "@/lib/dispute-labels";
import type { DisputeCategory, ListingExchangeTransactionSnapshot } from "../../../types";

const CATEGORIES: DisputeCategory[] = [
  "service_not_provided",
  "incorrect_charge_amount",
  "unsafe_environment",
  "seller_behavoir",
  "no_show",
];

type Props = {
  listingId: string;
  transaction: ListingExchangeTransactionSnapshot;
  resolutionCenterHref: string;
};

export function ExchangeDisputeSection({
  listingId,
  transaction,
  resolutionCenterHref,
}: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { createDispute } = useDisputes();
  const fileOneRef = useRef<HTMLInputElement | null>(null);
  const fileTwoRef = useRef<HTMLInputElement | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<DisputeCategory>("service_not_provided");
  const [explanation, setExplanation] = useState("");
  const [desiredAction, setDesiredAction] = useState<"full_refund" | "partial_refund">(
    "full_refund",
  );
  const [partialDollars, setPartialDollars] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("transactionId", transaction.id);
      fd.append("category", category);
      fd.append("disputeExplanation", explanation.trim());
      fd.append("desiredAction", desiredAction);
      if (desiredAction === "partial_refund") {
        const dollars = Number(partialDollars);
        if (!Number.isFinite(dollars) || dollars <= 0) {
          throw new Error("Enter a valid partial refund amount.");
        }
        fd.append("requestedRefundAmount", String(Math.round(dollars * 100)));
      }
      const f1 = fileOneRef.current?.files?.[0];
      const f2 = fileTwoRef.current?.files?.[0];
      if (f1) fd.append("imageOne", f1);
      if (f2) fd.append("imageTwo", f2);
      return createDispute(fd);
    },
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["listing-exchange", listingId] });
      await queryClient.invalidateQueries({
        queryKey: ["disputes", user?.id],
      });
    },
    onError: (e: Error) => setError(e.message),
  });

  if (transaction.hasDispute && transaction.disputeId) {
    return (
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 2, borderColor: "warning.main" }}>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom>
          Dispute in progress
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          A dispute is open on this purchase. Payment status is on hold while the case is
          reviewed.
        </Typography>
        <Button
          component={Link}
          href={`${resolutionCenterHref}/${encodeURIComponent(transaction.disputeId)}`}
          variant="contained"
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          View in Resolution center
        </Button>
      </Paper>
    );
  }

  const maxDollars = transaction.amountPaidCents / 100;

  if (!showForm) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={() => setShowForm((prev) => !prev)}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Open a dispute
        </Button>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={800}>
          Open a dispute
        </Typography>
        <Button
          size="small"
          color="inherit"
          onClick={() => setShowForm((prev) => !prev)}
          sx={{ textTransform: "none" }}
        >
          Cancel
        </Button>
      </Stack>

      <Stack spacing={2}>
        <FormControl fullWidth size="small">
          <InputLabel id="dispute-cat">Issue category</InputLabel>
          <Select
            labelId="dispute-cat"
            label="Issue category"
            value={category}
            onChange={(e) => setCategory(e.target.value as DisputeCategory)}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {DISPUTE_CATEGORY_LABELS[c]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="What happened?"
          multiline
          minRows={4}
          fullWidth
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          inputProps={{ minLength: 10 }}
        />

        <FormControl fullWidth size="small">
          <InputLabel id="dispute-action">Refund requested</InputLabel>
          <Select
            labelId="dispute-action"
            label="Refund requested"
            value={desiredAction}
            onChange={(e) =>
              setDesiredAction(e.target.value as "full_refund" | "partial_refund")
            }
          >
            <MenuItem value="full_refund">
              Full refund ({maxDollars.toLocaleString(undefined, { style: "currency", currency: "USD" })})
            </MenuItem>
            <MenuItem value="partial_refund">Partial refund</MenuItem>
          </Select>
        </FormControl>

        {desiredAction === "partial_refund" && (
          <TextField
            label="Refund amount (USD)"
            type="number"
            inputProps={{ min: 0.01, max: maxDollars, step: 0.01 }}
            value={partialDollars}
            onChange={(e) => setPartialDollars(e.target.value)}
            fullWidth
            size="small"
          />
        )}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="outlined" onClick={() => fileOneRef.current?.click()}>
            Add photo 1
          </Button>
          <Button variant="outlined" onClick={() => fileTwoRef.current?.click()}>
            Add photo 2
          </Button>
          <input ref={fileOneRef} type="file" accept="image/*" hidden />
          <input ref={fileTwoRef} type="file" accept="image/*" hidden />
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Button
          variant="contained"
          color="warning"
          disabled={
            createMutation.isPending ||
            explanation.trim().length < 10 ||
            (desiredAction === "partial_refund" && !partialDollars)
          }
          onClick={() => createMutation.mutate()}
          sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700 }}
        >
          {createMutation.isPending ? "Submitting…" : "Submit dispute"}
        </Button>
      </Stack>
    </Paper>
  );
}
