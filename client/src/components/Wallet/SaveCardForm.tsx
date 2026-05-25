"use client";

import { useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useQuery } from "@tanstack/react-query";

type Props = {
  clientSecret: string;
  onSaved: () => void;
  onCancel?: () => void;
};

/**
 * Self-contained "add a new card" panel.
 *
 * Nests its own <Elements> with the SetupIntent `clientSecret` (the
 * app-level provider in `layout.tsx` only has the publishable key loaded
 * eagerly - it doesn't carry an intent).
 */
export default function SaveCardForm(props: Props) {
  const { data: stripePromise, isLoading } = useQuery({
    queryKey: ["stripe-pub-key-lazy"],
    queryFn: async (): Promise<Promise<Stripe | null> | null> => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_KEY}/stripe/get-stripe-pub`,
      );
      const data = await res.json();
      return data?.stripePubKey ? loadStripe(String(data.stripePubKey)) : null;
    },
    staleTime: Infinity,
  });

  const options = useMemo(
    () =>
      props.clientSecret
        ? { clientSecret: props.clientSecret, appearance: { theme: "stripe" as const } }
        : undefined,
    [props.clientSecret],
  );

  if (isLoading || !stripePromise || !options) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <CardForm {...props} />
    </Elements>
  );
}

function CardForm({ clientSecret, onSaved, onCancel }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    try {
      const submitResult = await elements.submit();
      if (submitResult.error) {
        setError(submitResult.error.message || "Could not save card.");
        return;
      }

      const { error: confirmErr } = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });

      if (confirmErr) {
        setError(confirmErr.message || "Could not save card.");
        return;
      }

      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save card.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper
      variant="outlined"
      component="form"
      onSubmit={handleSubmit}
      sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}
    >
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Add a new card
      </Typography>

      <Box sx={{ my: 2 }}>
        <PaymentElement options={{ layout: "tabs" }} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <Button
          type="submit"
          variant="contained"
          disabled={!stripe || submitting}
          startIcon={
            submitting ? <CircularProgress size={16} color="inherit" /> : null
          }
        >
          {submitting ? "Saving…" : "Save card"}
        </Button>
        {onCancel && (
          <Button onClick={onCancel} variant="text" disabled={submitting}>
            Cancel
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
