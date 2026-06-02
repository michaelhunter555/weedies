"use client";

import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

type Props = {
  open: boolean;
  listingName: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (rejectionReason: string) => void;
};

export function RejectListingDialog({
  open,
  listingName,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reject listing</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Reject <b>{listingName || "this listing"}</b>. The seller receives an email with
          your note so they can fix issues and resubmit.
        </Typography>
        <TextField
          label="Rejection reason (optional)"
          placeholder="e.g. Screenshots do not match the description, or revenue claims need verification."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          fullWidth
          multiline
          minRows={4}
          inputProps={{ maxLength: 2000 }}
          helperText={`${reason.length} / 2000 — leave blank for a generic message`}
          disabled={busy}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={busy}
          onClick={() => onConfirm(reason.trim())}
        >
          {busy ? "Rejecting…" : "Reject listing"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
