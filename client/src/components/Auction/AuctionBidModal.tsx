"use client";

import { useEffect, useState } from "react";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatWholeDollars(amount: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export type AuctionBidModalProps = {
  open: boolean;
  onClose: () => void;
  listingTitle: string;
  currency: string;
  /** Highest of starting price and current high bid (dollars). */
  currentPrice: number;
  /** Smallest whole-dollar bid accepted (≥ $1 above current). */
  minimumNextBid: number;
  onSubmit: (amountDollars: number) => Promise<void>;
};

export function AuctionBidModal({
  open,
  onClose,
  listingTitle,
  currency,
  currentPrice,
  minimumNextBid,
  onSubmit,
}: AuctionBidModalProps) {
  const [raw, setRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRaw("");
    setError(null);
    setSubmitting(false);
  }, [open, minimumNextBid]);

  const handleSubmit = async () => {
    setError(null);
    const n = Number.parseFloat(raw.replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a valid bid amount.");
      return;
    }
    const bidCents = Math.round(n * 100);
    const minCents = Math.round(minimumNextBid * 100);
    const curCents = Math.round(currentPrice * 100);
    if (bidCents % 100 !== 0) {
      setError("Enter a whole dollar amount (no cents).");
      return;
    }
    if (bidCents < minCents) {
      setError(
        `Minimum bid is ${formatWholeDollars(minimumNextBid, currency)} (whole dollars, at least $1 above current price).`,
      );
      return;
    }
    if (bidCents <= curCents) {
      setError(
        `Your bid must be higher than the current price (${formatMoney(currentPrice, currency)}).`,
      );
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(n);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not continue to checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 5 }}>
        Your bid
        <IconButton
          aria-label="Close"
          onClick={onClose}
          disabled={submitting}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {listingTitle}
          </Typography>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Current price
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              {formatMoney(currentPrice, currency)}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Minimum next bid
              </Typography>
              <Chip
                label={formatWholeDollars(minimumNextBid, currency)}
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => !submitting && setRaw(String(Math.round(minimumNextBid)))}
                sx={{ fontWeight: 800, cursor: submitting ? "default" : "pointer" }}
                aria-label="Fill minimum next bid"
              />
            </Stack>
          </Box>
          <Alert severity="info" sx={{ py: 0.5 }}>
            Next you&apos;ll review everything on checkout. Bids are not charged to your card.
            Whole dollars only - each bid step is at least $1 above the current price.
          </Alert>
          <TextField
            label="Your bid"
            type="number"
            fullWidth
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            disabled={submitting}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    $
                  </InputAdornment>
                )
              }
            }}
            inputProps={{ min: Math.round(minimumNextBid), step: 1 }}
            helperText="Whole dollars only (e.g. 105, not 105.01). Tap the chip to use the minimum."
          />
          {error ? (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<GavelRoundedIcon />}
          onClick={() => void handleSubmit()}
          disabled={submitting}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {submitting ? "Continuing…" : "Continue to checkout"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
