export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  succeeded: "Succeeded",
  failed: "Failed",
  canceled: "Canceled",
  pending: "Pending",
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  stripe: "Stripe",
  escrow: "Escrow",
};

export { formatDisputeMoney as formatTransactionMoney } from "./dispute-labels";
