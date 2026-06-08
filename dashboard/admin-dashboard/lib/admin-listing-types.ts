export type ListingLinkCheckStatus =
  | "ok"
  | "missing"
  | "invalid_url"
  | "wrong_domain"
  | "not_required";

export type ListingLinkCheck = {
  platform: string;
  label: string;
  url: string | null;
  expectedPrefix: string | null;
  status: ListingLinkCheckStatus;
  message: string;
};

export type AdminListingTransactionSnapshot = {
  id: string;
  billingReason: string;
  paymentStatus: string | null;
  paymentType: string | null;
  amountPaidCents: number;
  serviceFeeCents: number;
  stripePaymentIntentId: string | null;
  chargeId: string | null;
  escrowTransactionId: string | null;
  paidOut: boolean;
  hasDispute: boolean;
  createdAt: string | null;
};

export type AdminListingPaymentsSnapshot = {
  listingStatus: string;
  sellerCommittedAt: string | null;
  privateListingFeePaid: boolean;
  listingFeePaymentIntentId: string | null;
  listingFeeStripeStatus: string | null;
  listingFee: AdminListingTransactionSnapshot | null;
  purchase: AdminListingTransactionSnapshot | null;
};

export type AdminListingReviewContext = {
  platformLinks: ListingLinkCheck[];
  socialLinks: ListingLinkCheck[];
  payments: AdminListingPaymentsSnapshot;
};
