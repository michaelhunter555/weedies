"use client";

import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

export type DeleteListingConfirmModalProps = {
  open: boolean;
  /** Listing display name (e.g. app name). */
  listingTitle: string;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

/**
 * Destructive confirmation before `DELETE /listings/:id` (soft-remove → `removed`).
 */
export function DeleteListingConfirmModal(props: DeleteListingConfirmModalProps) {
  const { open, listingTitle, loading = false, error, onClose, onConfirm } = props;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="delete-listing-title"
    >
      <DialogTitle id="delete-listing-title" sx={{ fontWeight: 800 }}>
        Remove this listing?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          You are about to remove{" "}
          <Typography component="span" variant="body2" fontWeight={800} color="text.primary">
            {listingTitle || "this listing"}
          </Typography>{" "}
          from the marketplace. It will no longer appear in search or on your public
          product URL. This cannot be undone from the app (contact support if you removed
          it by mistake).
        </Typography>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Confirm only if you are sure you want to delete this listing.
        </Alert>
        {error ? (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={loading} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={loading}
          onClick={() => onConfirm()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ textTransform: "none", borderRadius: 999, fontWeight: 700 }}
        >
          {loading ? "Removing…" : "Yes, remove listing"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
