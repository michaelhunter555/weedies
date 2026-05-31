"use client";

import * as React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import Paper from "@mui/material/Paper";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
  patchAdminDisputeDecision,
  type AdminDisputeDecision,
} from "@/lib/admin-api";
import { formatDisputeMoney } from "@/lib/dispute-labels";

const RESPONSE_TEMPLATES: { label: string; text: string }[] = [
  {
    label: "Buyer favor",
    text:
      "After reviewing the dispute and evidence, we have resolved this case in the buyer's favor. The agreed refund is being processed through Stripe. If you have questions, reply through Resolution Center messages.",
  },
  {
    label: "Seller favor",
    text:
      "After reviewing the dispute and evidence, we have resolved this case in the seller's favor. No refund will be issued and the transaction will proceed per marketplace terms. If you have questions, reply through Resolution Center messages.",
  },
  {
    label: "Partial refund",
    text:
      "After review, we approved a partial refund to the buyer for the amount stated in this case. The remaining balance, if any, follows our standard payout rules for the seller.",
  },
];

type RefundMode = "requested" | "full" | "custom";

type Props = {
  disputeId: string;
  amountPaidCents: number;
  requestedRefundCents: number;
  desiredAction: string;
  onResolved: () => void | Promise<void>;
};

export function DisputeResolvePanel({
  disputeId,
  amountPaidCents,
  requestedRefundCents,
  desiredAction,
  onResolved,
}: Props) {
  const [decision, setDecision] = React.useState<AdminDisputeDecision | "">("");
  const [refundMode, setRefundMode] = React.useState<RefundMode>("requested");
  const [customDollars, setCustomDollars] = React.useState("");
  const [platformResponse, setPlatformResponse] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const maxWholeDollars = Math.floor(amountPaidCents / 100);
  const defaultRequested =
    desiredAction === "partial_refund" && requestedRefundCents > 0
      ? requestedRefundCents
      : amountPaidCents;

  React.useEffect(() => {
    setRefundMode(
      desiredAction === "partial_refund" ? "requested" : "full",
    );
  }, [desiredAction, disputeId]);

  const refundCents = React.useMemo(() => {
    if (decision !== "in_favor_user") return 0;
    if (refundMode === "full") return amountPaidCents;
    if (refundMode === "requested") return defaultRequested;
    const dollars = Number(customDollars);
    if (!Number.isFinite(dollars) || dollars <= 0) return 0;
    return Math.round(dollars * 100);
  }, [
    decision,
    refundMode,
    amountPaidCents,
    defaultRequested,
    customDollars,
  ]);

  const responseOk = platformResponse.trim().length >= 10;
  const refundOk =
    decision !== "in_favor_user" ||
    (refundCents > 0 &&
      refundCents <= amountPaidCents &&
      refundCents % 100 === 0);
  const decisionOk = decision === "in_favor_user" || decision === "in_favor_seller";
  const canSubmit = decisionOk && responseOk && refundOk && !submitting;

  const customRefundError =
    decision === "in_favor_user" &&
    refundMode === "custom" &&
    customDollars.trim() !== "" &&
    !refundOk
      ? `Enter a whole dollar amount from $1 to $${maxWholeDollars}.`
      : null;

  const handleSubmit = async () => {
    if (!decisionOk || !responseOk || !refundOk) return;
    setSubmitting(true);
    setError(null);
    try {
      await patchAdminDisputeDecision(disputeId, {
        decision,
        platformResponse: platformResponse.trim(),
        ...(decision === "in_favor_user"
          ? { refundAmountCents: refundCents }
          : {}),
      });
      setSuccess("Dispute closed. Both parties were emailed.");
      setConfirmOpen(false);
      await onResolved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close dispute.");
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 2,
        borderColor: "primary.main",
        borderWidth: 2,
      }}
    >
      <Typography variant="subtitle1" fontWeight={800} gutterBottom>
        Resolve dispute
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Pick who wins, write the message both parties will see (min 10 characters),
        then confirm. A refund is only processed if you choose the buyer.
      </Typography>

      {success ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Stack spacing={2.5}>
        <FormControl component="fieldset" required>
          <FormLabel component="legend" sx={{ fontWeight: 700, mb: 0.5 }}>
            1. Outcome
          </FormLabel>
          <RadioGroup
            value={decision}
            onChange={(e) =>
              setDecision(e.target.value as AdminDisputeDecision)
            }
          >
            <FormControlLabel
              value="in_favor_user"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    In favor of buyer
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Issue a Stripe refund and close the dispute.
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="in_favor_seller"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    In favor of seller
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    No refund; clear dispute hold so payout can continue.
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        {decision === "in_favor_seller" ? (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              No refund will be issued
            </Typography>
            <Typography variant="body2">
              Closing in the seller&apos;s favor does not charge Stripe again or
              send money back to the buyer. The dispute hold on the transaction is
              cleared so the seller can receive payout for the sale.
            </Typography>
          </Alert>
        ) : null}

        {decision === "in_favor_user" ? (
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ fontWeight: 700, mb: 0.5 }}>
              2. Refund amount
            </FormLabel>
            <RadioGroup
              value={refundMode}
              onChange={(e) => setRefundMode(e.target.value as RefundMode)}
            >
              <FormControlLabel
                value="requested"
                control={<Radio />}
                label={`Buyer's request (${formatDisputeMoney(defaultRequested)})`}
              />
              <FormControlLabel
                value="full"
                control={<Radio />}
                label={`Full payment (${formatDisputeMoney(amountPaidCents)})`}
              />
              <FormControlLabel
                value="custom"
                control={<Radio />}
                label="Custom whole-dollar amount"
              />
            </RadioGroup>
            {refundMode === "custom" ? (
              <TextField
                label="Refund (USD, whole dollars)"
                type="number"
                size="small"
                value={customDollars}
                onChange={(e) =>
                  setCustomDollars(e.target.value.replace(/\D/g, ""))
                }
                inputProps={{ min: 1, max: maxWholeDollars, step: 1 }}
                helperText={
                  customRefundError ??
                  `Max ${formatDisputeMoney(amountPaidCents)}`
                }
                error={Boolean(customRefundError)}
                sx={{ mt: 1, maxWidth: 280 }}
              />
            ) : null}
            <Alert severity="info" sx={{ mt: 1.5 }}>
              Stripe will refund{" "}
              <b>{refundOk ? formatDisputeMoney(refundCents) : "—"}</b>
              {refundCents > 0 && refundCents < amountPaidCents
                ? ` · Seller keeps ${formatDisputeMoney(amountPaidCents - refundCents)}`
                : null}
            </Alert>
          </FormControl>
        ) : null}

        <Box>
          <FormLabel sx={{ fontWeight: 700, mb: 1, display: "block" }}>
            {decision === "in_favor_user" ? "3." : "2."} Platform response
          </FormLabel>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
            {RESPONSE_TEMPLATES.map((t) => (
              <Chip
                key={t.label}
                label={t.label}
                size="small"
                onClick={() => setPlatformResponse(t.text)}
                variant="outlined"
                sx={{ cursor: "pointer" }}
              />
            ))}
          </Stack>
          <TextField
            multiline
            minRows={5}
            fullWidth
            required
            placeholder="Explain the decision to both parties (emailed and shown in Resolution Center)."
            value={platformResponse}
            onChange={(e) => setPlatformResponse(e.target.value)}
            error={platformResponse.length > 0 && !responseOk}
            helperText={`${platformResponse.trim().length} / 10 characters minimum`}
          />
        </Box>

        <Divider />

        <Stack spacing={0.75}>
          <RequirementRow ok={decisionOk} label="Outcome selected" />
          {decision === "in_favor_user" ? (
            <RequirementRow ok={refundOk} label="Refund amount set" />
          ) : decision === "in_favor_seller" ? (
            <RequirementRow
              ok
              label="No refund — seller keeps payment (hold cleared)"
            />
          ) : (
            <RequirementRow
              ok={false}
              label="Refund step applies only if buyer wins"
            />
          )}
          <RequirementRow ok={responseOk} label="Platform response (≥10 chars)" />
        </Stack>

        <Button
          variant="contained"
          size="large"
          disabled={!canSubmit}
          onClick={() => setConfirmOpen(true)}
          sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700 }}
        >
          Review and close dispute
        </Button>
      </Stack>

      <Dialog open={confirmOpen} onClose={() => !submitting && setConfirmOpen(false)}>
        <DialogTitle>Confirm resolution</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography variant="body2">
              <b>Outcome:</b>{" "}
              {decision === "in_favor_user"
                ? "Buyer wins"
                : "Seller wins"}
            </Typography>
            {decision === "in_favor_user" ? (
              <Typography variant="body2">
                <b>Refund to buyer:</b> {formatDisputeMoney(refundCents)}
              </Typography>
            ) : (
              <Alert severity="warning" sx={{ py: 0.5 }}>
                <Typography variant="body2">
                  <b>No refund</b> will be issued. The buyer will not receive money
                  back; the seller remains eligible for payout on this sale.
                </Typography>
              </Alert>
            )}
            <Typography variant="body2">
              <b>Message to parties:</b>
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "action.hover" }}>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {platformResponse.trim()}
              </Typography>
            </Paper>
            <Typography variant="caption" color="text.secondary">
              This cannot be undone from the dashboard. Emails will be sent to
              buyer and seller.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            disabled={submitting}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? "Processing…" : "Confirm and close"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function RequirementRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <CheckCircleOutlineIcon
        fontSize="small"
        color={ok ? "success" : "disabled"}
      />
      <Typography
        variant="body2"
        color={ok ? "text.primary" : "text.secondary"}
      >
        {label}
      </Typography>
    </Stack>
  );
}
