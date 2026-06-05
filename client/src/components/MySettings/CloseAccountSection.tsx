"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from 'firebase/auth'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useAuth } from "@/context/auth-context";
import { useApiFetchOrThrow } from "@/hooks/use-api-fetch";
import { BRAND_PALETTE } from "@/theme/brand-palette";

type DeleteAccountResponse = {
  ok?: boolean;
  message?: string;
};

const CONFIRM_PHRASE = "CLOSE";

export function CloseAccountSection() {
  const router = useRouter();
  const auth = getAuth();
  const { logout } = useAuth();
  const { apiFetch } = useApiFetchOrThrow();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;

  const handleCloseDialog = () => {
    if (loading) return;
    setDialogOpen(false);
    setConfirmText("");
    setError(null);
  };

  const handleConfirm = async () => {
    if (!canConfirm || loading) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch<DeleteAccountResponse>("/user/me", "DELETE");
      handleCloseDialog();
      await auth.currentUser?.delete();
      await logout();
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not close your account.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          mt: 4,
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          borderColor: "rgba(239,68,68,0.35)",
          bgcolor: "#fff",
        }}
      >
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#b91c1c" }}>
            Close account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Permanently delete your account, disconnect Stripe, and sign out on this
            device. You must resolve open listings, sales, and disputes first.
          </Typography>
          <Box>
            <Button
              variant="outlined"
              color="error"
              onClick={() => setDialogOpen(true)}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Close account
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Close your account?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <DialogContentText>
              This cannot be undone. Your profile will be removed and you will be
              signed out everywhere on this browser.
            </DialogContentText>
            <DialogContentText component="div" variant="body2">
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                <li>Remove or complete active listings</li>
                <li>Finish open purchases or sales</li>
                <li>Resolve open disputes</li>
                <li>Zero Stripe Connect balance (sellers)</li>
              </Box>
            </DialogContentText>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Type <strong>{CONFIRM_PHRASE}</strong> to confirm
            </Typography>
            <TextField
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              disabled={loading}
              fullWidth
              size="small"
              autoComplete="off"
              sx={{
                "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                  borderColor: BRAND_PALETTE.seafoam,
                },
              }}
            />
            {error ? (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={!canConfirm || loading}
            onClick={() => void handleConfirm()}
          >
            {loading ? "Closing…" : "Close account permanently"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
