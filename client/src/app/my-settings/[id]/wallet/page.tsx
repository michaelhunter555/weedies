"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/auth-context";
import SaveCardForm from "@/components/Wallet/SaveCardForm";
import { WalletBillingTab } from "@/components/Wallet/WalletBillingTab";
import {
  type StripePaymentMethod,
  useStripeWallet,
} from "@/hooks/use-stripe-wallet";

/**
 * /my-settings/[id]/wallet
 *
 * Buyer-side payment settings - list saved cards, set a default, add a new
 * one via SetupIntent, and bulk-detach cards.
 *
 * Adapted from the old RN `MyWallet` screen. Expects the following backend
 * endpoints under `/api/stripe/`:
 *   GET  /payment-methods?customerId=…
 *   POST /setup-intent              { customerId }
 *   POST /default-payment-method    { customerId, paymentMethodId }
 *   POST /delete-payment-methods    { paymentMethodIds }
 */
export default function WalletPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, hydrated, update } = useAuth();

  const {
    getPaymentMethods,
    createSetupIntent,
    updateDefaultPayment,
    deletePaymentMethods,
  } = useStripeWallet();

  const [selectedDefaultId, setSelectedDefaultId] = useState<string | null>(
    user?.stripeDefaultPaymentMethodId ?? null,
  );
  const [toggleAddCard, setToggleAddCard] = useState(false);
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "error" | "success";
  }>({ open: false, message: "", severity: "success" });

  const stripeCustomerId = user?.stripeCustomerId;

  const {
    data: paymentMethods,
    isLoading: isLoadingCards,
    isError: cardsError,
    error: cardsErrorObj,
    refetch: refetchCards,
  } = useQuery({
    queryKey: ["stripe-payment-methods", stripeCustomerId],
    queryFn: () => getPaymentMethods(String(stripeCustomerId)),
    enabled: Boolean(stripeCustomerId),
  });

  useEffect(() => {
    if (isLoadingCards || !paymentMethods) return;
    const def = paymentMethods.defaultPaymentMethodId ?? null;
    const list = paymentMethods.paymentMethods?.data ?? [];
    setSelectedDefaultId((prev) => {
      if (def) return def;
      if (list.length === 1) return list[0].id;
      return prev;
    });
  }, [isLoadingCards, paymentMethods]);

  const {
    data: clientSecret,
    isLoading: isLoadingSecret,
    isError: secretError,
    error: secretErrorObj,
  } = useQuery({
    queryKey: ["stripe-setup-intent", stripeCustomerId],
    queryFn: () => createSetupIntent(String(stripeCustomerId)),
    enabled: Boolean(stripeCustomerId && toggleAddCard),
    staleTime: 10 * 60 * 1000,
  });

  const cardList: StripePaymentMethod[] =
    paymentMethods?.paymentMethods?.data ?? [];
  const hasCard = paymentMethods?.hasCard ?? cardList.length > 0;

  const setDefaultMutation = useMutation({
    mutationKey: ["stripe-update-default", stripeCustomerId],
    mutationFn: (paymentMethodId: string) =>
      updateDefaultPayment(String(stripeCustomerId), paymentMethodId),
    onSuccess: async (_data, paymentMethodId) => {
      if (user && paymentMethodId) {
        update({
          ...user,
          stripeDefaultPaymentMethodId: paymentMethodId,
          defaultPaymentIntendId: paymentMethodId,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["stripe-payment-methods"] });
      await queryClient.invalidateQueries({ queryKey: ["buyer-billing"] });
      await queryClient.invalidateQueries({ queryKey: ["stripe-billing-history"] });
      await refetchCards();
      setToast({
        open: true,
        severity: "success",
        message: "Default card updated.",
      });
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        severity: "error",
        message: err?.message ?? "Could not update default card.",
      });
    },
  });

  const removeMutation = useMutation({
    mutationKey: ["stripe-remove-cards"],
    mutationFn: (ids: string[]) => deletePaymentMethods(ids),
    onSuccess: async () => {
      const def = paymentMethods?.defaultPaymentMethodId;
      if (user && def && removeIds.includes(def)) {
        update({
          ...user,
          stripeDefaultPaymentMethodId: null,
          defaultPaymentIntendId: null,
        });
        setSelectedDefaultId(null);
      } else if (
        user?.stripeDefaultPaymentMethodId &&
        removeIds.includes(user.stripeDefaultPaymentMethodId)
      ) {
        update({
          ...user,
          stripeDefaultPaymentMethodId: null,
          defaultPaymentIntendId: null,
        });
        setSelectedDefaultId(null);
      }
      setRemoveIds([]);
      setConfirmOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["stripe-payment-methods"] });
      await queryClient.invalidateQueries({ queryKey: ["buyer-billing"] });
      await queryClient.invalidateQueries({ queryKey: ["stripe-billing-history"] });
      await refetchCards();
      setToast({
        open: true,
        severity: "success",
        message: "Card(s) removed.",
      });
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        severity: "error",
        message: err?.message ?? "Could not remove card(s).",
      });
    },
  });

  const toggleRemove = (id: string) =>
    setRemoveIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const effectiveDefaultId =
    paymentMethods?.defaultPaymentMethodId ??
    user?.stripeDefaultPaymentMethodId ??
    null;

  const hasPendingDefaultChange =
    hasCard &&
    Boolean(selectedDefaultId) &&
    selectedDefaultId !== effectiveDefaultId;

  const showStickyActions =
    tab === 0 && (Boolean(hasPendingDefaultChange) || removeIds.length > 0);

  if (!hydrated) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="warning">Please log in to manage your wallet.</Alert>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 }, pb: showStickyActions ? 16 : 8 }}>
        <Button
          onClick={() => router.back()}
          startIcon={<ArrowBackRoundedIcon />}
          sx={{ mb: 2, textTransform: "none" }}
          color="inherit"
        >
          Go Back
        </Button>

        <Typography variant="h4" fontWeight={700} gutterBottom>
          Wallet &amp; billing
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Manage saved cards and view charges on your account.
        </Typography>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Wallet" sx={{ textTransform: "none", fontWeight: 700 }} />
          <Tab label="Billing" sx={{ textTransform: "none", fontWeight: 700 }} />
        </Tabs>

        {tab === 1 ? (
          <WalletBillingTab />
        ) : (
          <>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ mb: 3 }}
          flexWrap="wrap"
          useFlexGap
        >
          <Typography variant="subtitle2">Purchase eligibility:</Typography>
          <Chip
            size="small"
            icon={
              effectiveDefaultId ? (
                <CheckCircleRoundedIcon fontSize="small" />
              ) : (
                <ErrorRoundedIcon fontSize="small" />
              )
            }
            label={
              effectiveDefaultId
                ? "Eligible to purchase"
                : "Default card not set in Stripe"
            }
            color={effectiveDefaultId ? "success" : "warning"}
            variant="outlined"
          />
        </Stack>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" fontWeight={600}>
          Payment method(s)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
          Tap a card to mark it as your default, then save. Card details are
          encrypted and stored with Stripe - we never see them.
        </Typography>

        {cardsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(cardsErrorObj as Error)?.message || "Failed to load payment methods."}
          </Alert>
        )}
        {secretError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(secretErrorObj as Error)?.message || "Failed to start add-card flow."}
          </Alert>
        )}

        <Stack spacing={1.5} sx={{ mb: 3 }}>
          {isLoadingCards && (
            <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderRadius: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                Checking for cards…
              </Typography>
            </Paper>
          )}

          {!isLoadingCards &&
            hasCard &&
            cardList.map((pm) => {
              const { card } = pm;
              const isMarkedForRemoval = removeIds.includes(pm.id);
              const isSelectedDefault = selectedDefaultId === pm.id;
              const isPersistedDefault = effectiveDefaultId === pm.id;

              return (
                <Paper
                  key={pm.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    cursor: "pointer",
                    borderColor: isSelectedDefault ? "primary.main" : undefined,
                    transition: "border-color 120ms ease",
                  }}
                  onClick={() => setSelectedDefaultId(pm.id)}
                >
                  <Checkbox
                    checked={isMarkedForRemoval}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleRemove(pm.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    color="error"
                    size="small"
                  />
                  <CreditCardRoundedIcon color="action" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {card.brand.toUpperCase()} •••• {card.last4}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Expires {card.exp_month}/{card.exp_year}
                    </Typography>
                  </Box>
                  {isSelectedDefault && !isPersistedDefault && (
                    <Chip label="Set default" size="small" color="primary" />
                  )}
                  {isPersistedDefault && (
                    <Chip
                      label="Default"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  )}
                </Paper>
              );
            })}

          {!isLoadingCards && !hasCard && (
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                borderRadius: 2,
                textAlign: "center",
                borderStyle: "dashed",
              }}
            >
              <CreditCardRoundedIcon color="disabled" sx={{ fontSize: 36 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No payment methods on file. Add a card to get started.
              </Typography>
            </Paper>
          )}
        </Stack>

        <Divider sx={{ mb: 3 }} />

        <Button
          onClick={() => setToggleAddCard((v) => !v)}
          startIcon={
            toggleAddCard ? (
              <RemoveCircleOutlineRoundedIcon />
            ) : (
              <AddCircleOutlineRoundedIcon />
            )
          }
          sx={{ mb: 2, textTransform: "none", fontWeight: 600 }}
        >
          {toggleAddCard ? "Cancel" : "Add another"}
        </Button>

        {toggleAddCard && isLoadingSecret && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {toggleAddCard && clientSecret && (
          <SaveCardForm
            clientSecret={clientSecret}
            onSaved={() => {
              setToggleAddCard(false);
              void queryClient.invalidateQueries({ queryKey: ["stripe-payment-methods"] });
              void queryClient.invalidateQueries({ queryKey: ["buyer-billing"] });
              void queryClient.invalidateQueries({ queryKey: ["stripe-billing-history"] });
              void refetchCards();
              setToast({
                open: true,
                severity: "success",
                message: "Card saved.",
              });
            }}
            onCancel={() => setToggleAddCard(false)}
          />
        )}
          </>
        )}
      </Container>

      {showStickyActions && (
        <Paper
          elevation={8}
          square
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: (t) => t.zIndex.appBar - 1,
            borderTop: 1,
            borderColor: "divider",
            p: 2,
          }}
        >
          <Container maxWidth="md">
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              justifyContent="flex-end"
            >
              {hasPendingDefaultChange && (
                <Button
                  variant="contained"
                  onClick={() =>
                    setDefaultMutation.mutate(String(selectedDefaultId))
                  }
                  disabled={setDefaultMutation.isPending}
                  startIcon={
                    setDefaultMutation.isPending ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : null
                  }
                >
                  {setDefaultMutation.isPending
                    ? "Saving…"
                    : "Set as default card"}
                </Button>
              )}
              {removeIds.length > 0 && (
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => setConfirmOpen(true)}
                >
                  Delete {removeIds.length} card
                  {removeIds.length === 1 ? "" : "s"}
                </Button>
              )}
            </Stack>
          </Container>
        </Paper>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Please read & confirm</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This action cannot be reversed. Once a card is removed it can no
            longer be re-added and associated with your account. You can always
            change your default card if you wish to switch payment methods.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => removeMutation.mutate(removeIds)}
            color="error"
            variant="contained"
            disabled={removeMutation.isPending}
            startIcon={
              removeMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
          >
            {removeMutation.isPending ? "Removing…" : "Confirm & remove"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}
