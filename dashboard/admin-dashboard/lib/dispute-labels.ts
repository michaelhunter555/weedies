export const DISPUTE_CATEGORY_LABELS: Record<string, string> = {
  no_show: "No show / missing handover",
  service_not_provided: "Service or assets not provided",
  unsafe_environment: "Unsafe or misleading experience",
  incorrect_charge_amount: "Incorrect charge amount",
  client_behavoir: "Buyer behavior concern",
  seller_behavoir: "Seller behavior concern",
};

export const DISPUTE_STATUS_LABELS: Record<string, string> = {
  awaiting_seller_response: "Awaiting seller",
  awaiting_user_response: "Awaiting buyer",
  in_review: "Platform review",
  closed: "Closed",
};

export function formatDisputeMoney(cents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}
