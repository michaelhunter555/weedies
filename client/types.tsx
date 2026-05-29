//
// Client-side shared types.
//
// NOTE: Keep this file free of React/MUI/JSX imports - it's consumed by both
// UI components and context/reducers.
//

// =========================
// useForm hook
// =========================

/**
 * @name: Inputs
 * @description - Form Inputs for useForm() hook.
 */
export type Inputs = {
  value:
    | string
    | number
    | boolean
    | string[]
    | Record<string, any>[]
    | undefined;
  isValid: boolean;
};

/**
 * @name: State
 * @description - State of form hook.
 */
export type State = {
  inputs: Record<string, Inputs>;
  isValid: boolean;
};

/**
 * @name: InputChangeAction
 * @description - input changes in useForm hook.
 */
export type InputChangeAction = {
  type: "INPUT_CHANGE";
  value: string | number | boolean | string[];
  isValid: boolean;
  inputId: string;
};

/**
 * @name: SetFormAction
 * @description - set form to confirm if all fields ar evalid
 */
export type SetFormAction = {
  type: "SET_DATA";
  inputs: Record<string, Inputs>;
  formIsValid: boolean;
};

/**
 * @name: Action
 * @description - Action types for useForm hook
 */
export type Action = InputChangeAction | SetFormAction;

// =========================
// Auth / user
// =========================

export type UserRole = "user" | "admin";
export type AuthProvider = "local" | "firebase" | "google";

/**
 * Credentials for the email/password login + signup flows.
 * The server handles provider-specific auth (firebase/google) itself.
 */
export type UserProps = {
  userName?: string;
  email: string;
  password: string;
};

/** Mirrors `backend/types/account-status.ts`. */
export type AccountStanding = "good" | "suspended" | "banned";

export function isAccountRestricted(
  standing: AccountStanding | string | undefined | null,
): boolean {
  return standing === "suspended" || standing === "banned";
}

/**
 * Shape of the currently-authenticated user as held by the auth context.
 * This mirrors what the backend returns from /api/user/{login,sign-up}
 * (see backend/controllers/customers/signup.ts) plus a handful of
 * marketplace-creator counters used across the UI.
 */
export interface UserObject {
  id: string;
  email: string;
  /** False for email/password until Firebase inbox is verified and synced. */
  emailVerified?: boolean;
  name?: string;
  mode?: "customer" | "seller";
  /** Backwards-compatible alias for `name` used by older UI bits. */
  userName?: string;
  role?: UserRole;
  accountStanding?: AccountStanding;
  authProvider?: AuthProvider;
  sellerRating?: number;
  totalSellerReviews?: number;

  // Provider identifiers (only one is set depending on authProvider)
  firebaseUid?: string | null;
  googleSub?: string | null;

  // Marketplace-creator stats (driven by backend aggregates)
  totalListings?: number;
  totalListingsSold?: number;
  totalSales?: number;
  totalReviews?: number;
  rewardPoints?: number;
  cred?: number;

  // Payouts / billing
  stripeCustomerId?: string;
  stripeConnectAccountId?: string;
  /** Stripe Connect Express account id (mirrors `stripeConnectAccountId`). */
  stripeAccountId?: string;
  stripeDefaultPaymentMethodId?: string | null;
  outstandingBalance?: number;
  /** Whether the seller has completed Stripe Connect onboarding. */
  isOnboarded?: boolean;
  /**
   * @deprecated Typo for `isOnboarded`. Retained as an optional alias so
   * older call sites don't break while they migrate.
   */
  isOboarded?: boolean;
  defaultPaymentIntendId?: string | null;

  // Verification badges
  isVerifiedCreator?: boolean;
  hasVerifiedAnalytics?: boolean;

  // Timestamps
  lastLoginDate?: string | Date | null;
  /** IANA timezone, e.g. `America/New_York`. */
  timezone?: string | null;
  /** BCP 47 locale, e.g. `en-US`. */
  locale?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/** Email/password accounts must verify inbox before using the marketplace. */
export function needsEmailVerification(
  user: Pick<UserObject, "authProvider" | "emailVerified"> | null | undefined,
): boolean {
  if (!user) return false;
  if (user.authProvider === "google") return false;
  return user.emailVerified !== true;
}

// =========================
// Backend model types (client-friendly)
// - ObjectIds -> string
// - Dates -> string | Date
// =========================

export type TShippingAddress = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export type Product = {
  _id?: string;
  name: string;
  description: string;
  price: number;
  buyItNowPrice?: number;
  previousPrice?: number;
  image: string[];
  category: string;
  subCategory: string;
  brand: string;
  stock: number;
  isActive: boolean;
  totalReviews: number;
  averageRating: number;
  sku?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  isListingVerified?: boolean;
  isAnalyticsVerified?: boolean;
};

// =========================
// Marketplace listing (form + API payload)
// =========================

export type ListingCategory =
  | "ai-tools"
  | "productivity"
  | "games"
  | "dev-tools"
  | "design"
  | "extensions";

export type ListingTurnaround = "24h" | "3d" | "1w" | "2w" | "1m";

export type ListingDifficulty = "beginner" | "intermediate" | "advanced";

export type AnalyticsProvider =
  | "revenuecat"
  | "google-analytics"
  | "stripe"
  | "mixpanel"
  | "plausible";

export type ListingSaleType = "fixed" | "auction";

export type AuctionBidStatus = "pending" | "accepted" | "rejected";

/** Response from `GET /listings/:id/google-analytics/metrics` */
export type GaListingMetricsSnapshot = {
  dailySessions: { date: string; sessions: number }[];
  bounceRate: number;
  averageSessionDurationSeconds: number;
  totalSessions: number;
};

/**
 * One `auctionBids` subdocument (same field as Mongo). `bidderId` is a string in JSON.
 * Omitted on public listing GETs (use `auctionCurrentPrice` / `auctionMinimumNextBid` / counts);
 * included on paginated `GET /listings/me/mine` and seller bid PATCH responses for auction listings.
 */
export type ListingAuctionBid = {
  _id: string;
  bidderId: string;
  amount: number;
  createdAt?: string | Date;
  bidStatus: AuctionBidStatus;
};

/** `GET /listings/me/auction-bids` — listing summary + only the signed-in user's bid rows. */
export type MyAuctionBidListingSummary = {
  _id: string;
  slug: string;
  appName: string;
  status: string;
  photos: string[];
  coverIndex: number;
  auctionEndDate: string | Date | null;
  startingPrice: number;
  auctionCurrentPrice: number;
  auctionMinimumNextBid: number;
  auctionHighBidAmount: number | null;
};

export type MyAuctionBidRow = {
  listing: MyAuctionBidListingSummary;
  myBids: Array<{
    _id: string;
    amount: number;
    createdAt?: string | Date;
    bidStatus: AuctionBidStatus;
  }>;
};

/** Public listing payload: accepted bids only (no bidder ids). Oldest first. */
export type AuctionAcceptedBidPublic = {
  _id: string;
  amount: number;
  createdAt?: string | Date;
};

export type ListingStatus =
  | "draft"
  | "pending_review"
  | "live"
  | "reserved"
  | "paused"
  | "rejected"
  | "sold"
  | "removed";

/**
 * Shape of a new listing submission. Mirrors the form on /products?list=new
 * and the backend `Listing` model.
 */
export type Listing = {
  _id?: string;
  sellerId: string;
  slug?: string;
  appName: string;
  tagline: string;
  appDescription: string;
  category: ListingCategory;
  difficulty: ListingDifficulty;
  turnaround: ListingTurnaround;
  ageOfBusinessMonths: number;
  auctionFollowers?: string[];

  saleType?: ListingSaleType;
  startingPrice: number;
  buyItNowPrice?: number;
  auctionStartDate?: string | Date;
  auctionEndDate?: string | Date;
  currency?: string;

  photos: string[];
  coverIndex?: number;
  demoUrl?: string;
  repoUrl?: string;
  liveUrl?: string;

  tags?: string[];
  techStack?: string[];

  monthlyRevenue?: number;
  monthlyActiveUsers?: number;

  hasSalesToVerify?: boolean;
  hasAnalyticsToVerify?: boolean;
  verifiedProviders?: AnalyticsProvider[];
  isListingVerified?: boolean;
  isAnalyticsVerified?: boolean;

  /** Linked GA4 property (after OAuth + property picker). */
  googleAnalyticsPropertyResourceName?: string;
  googleAnalyticsPropertyDisplayName?: string;
  /** Linked RevenueCat project (manual / future API). */
  revenueCatProjectId?: string;
  revenueCatProjectDisplayName?: string;

  status?: ListingStatus;
  rejectionReason?: string;
  agreedToTermsAt?: string | Date;
  publishedAt?: string | Date;
  soldAt?: string | Date;
  buyerId?: string;

  views?: number;
  favoritesCount?: number;
  totalReviews?: number;
  averageRating?: number;
  paymentIntentId?: string | null;
  /** Server-only: fee / listing slot applied (duplicate submit guard). */
  sellerCommittedAt?: string | Date;
  /** When > 0, seller cannot edit listing fields (reserved for bid APIs). */
  openBidCount?: number;
  /** Public auction summary on listing GETs (no per-bid rows). */
  auctionCurrentPrice?: number;
  auctionMinimumNextBid?: number;
  auctionBidCount?: number;
  auctionHighBidAmount?: number | null;
  /**
   * Public auction listings: accepted bid timeline (amount + time). Populated from
   * `auctionBids` on the server; raw `auctionBids` stay off public GETs for privacy.
   */
  auctionAcceptedBidHistory?: AuctionAcceptedBidPublic[];
  /** Seller dashboard: bids awaiting accept/reject (from `GET /listings/me/mine`). */
  auctionPendingBidCount?: number;
  /** Full bid rows - same field name as Mongo `auctionBids`; only on seller mine / bid PATCH. */
  auctionBids?: ListingAuctionBid[];
  /** Present on paginated `GET /listings/me/mine` - whether listing copy can still be edited. */
  sellerCanEdit?: boolean;

  createdAt?: string | Date;
  updatedAt?: string | Date;

  // Private listing - only visible to approved users
  isPrivateListing?: boolean;
  /** List of user IDs that are approved to view the private listing. */
  approvedUsersList?: string[] | null;
  pendingPrivateListingRequests?: {
    _id?: string;
    requesterId: string;
    message?: string;
    status: "pending" | "approved" | "denied";
    createdAt?: string | Date;
    resolvedAt?: string | Date | null;
    requester?: {
      id: string;
      name: string;
      locale?: string | null;
      timezone?: string | null;
      regionLabel: string;
    };
  }[];
  privateAccess?: {
    canView: boolean;
    status: "none" | "pending" | "approved" | "denied";
    requestId?: string | null;
  };
};

export type SellerListingEditMeta = {
  canEdit: boolean;
  reason?: string;
  status?: string;
  openBidCount?: number;
};

/** Post-sale handover room (`GET /listings/exchange/:listingId`). */
export type ListingExchangePhase = "payment" | "handover" | "completed";

export type ListingExchangeRoomRole = "buyer" | "seller";

export type ListingExchangeDeliverable = {
  url: string;
  originalName?: string;
  uploadedAt: string;
};

export type ListingExchangeSnapshot = {
  _id: string;
  listingId: string;
  sellerId: string;
  buyerId: string;
  paymentReceivedAt: string | null;
  deliverables: ListingExchangeDeliverable[];
  buyerConfirmedAt: string | null;
  updatedAt?: string | null;
  sellerCapturedPayment?: boolean;
  paymentCaptureExpiration?: string | Date | null;
  paymentStatus?: "succeeded" | "failed" | "canceled" | "pending" | "disputed";
};

export type ListingExchangeTransactionSnapshot = {
  id: string;
  hasDispute: boolean;
  disputeId: string | null;
  amountPaidCents: number;
  paymentStatus: string | null;
  paymentType?: "stripe" | "escrow";
  escrowTransactionId?: string | null;
  escrowTransactionUrl?: string | null;
};

/** Buyer-only snapshot from `GET /listings/exchange/:id` (null for seller). */
export type ListingExchangeBuyerReview = {
  _id: string;
  rating: number | null;
  comment: string;
  datePosted: string;
};

export type ListingExchangePayload = {
  role: ListingExchangeRoomRole;
  phase: ListingExchangePhase;
  /** Escrow checkout started but listing not sold until payment webhooks. */
  escrowAwaitingFunds?: boolean;
  /** Present when `role === "buyer"`; omitted or null for seller. */
  buyerReview?: ListingExchangeBuyerReview | null;
  transaction?: ListingExchangeTransactionSnapshot | null;
  exchange: ListingExchangeSnapshot;
  listing: {
    _id: string;
    appName: string;
    slug?: string;
    photos: string[];
    coverIndex: number;
    saleType?: ListingSaleType;
    status?: string;
    currency: string;
    buyItNowPrice?: number;
    startingPrice?: number;
  };
};

/** Row from paginated `GET /listings/me/marketplace-orders` (buy-it-now checkout). */
export type MarketplaceOrderRow = {
  transactionId: string;
  role: "buyer" | "seller";
  listingId: string;
  slug: string;
  appName: string;
  coverUrl: string | null;
  amountCents: number;
  currency: string;
  paymentStatus?: "succeeded" | "failed" | "canceled" | "pending";
  listingStatus?: string;
  purchasedAt: string;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type MyListingsMeta = {
  totalActive: number;
  totalSold: number;
  pendingPrivateAccessTotal: number;
};

export type MyListingsPayload = Paginated<Listing> & {
  meta: MyListingsMeta;
};

export type MyMarketplaceOrdersPayload = {
  purchases: Paginated<MarketplaceOrderRow>;
  sales: Paginated<MarketplaceOrderRow>;
};

/** Row from `GET /stripe/billing-history` (wallet Billing tab). */
export type BillingHistoryRow = {
  transactionId: string;
  listingId: string;
  slug: string;
  appName: string;
  coverUrl: string | null;
  billingReason: string;
  amountCents: number;
  currency: string;
  paymentStatus?: "succeeded" | "failed" | "canceled" | "pending";
  purchasedAt: string;
};

export type BillingHistoryPayload = {
  ok?: boolean;
  items: BillingHistoryRow[];
};

// =========================
// Orders / reviews / promos / issues
// =========================

export type OrderDiscountType = "percentage" | "fixed";

export type Order = {
  _id?: string;
  userId: string;
  productId: string;
  quantity: number;
  price: number;
  totalPrice: number;
  discount?: number;
  discountType?: OrderDiscountType;
  discountCode?: string;
  orderDate: string | Date;
  trackingNumber: string;
  shippingAddress: TShippingAddress;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type Review = {
  _id?: string;
  /** Marketplace listing being reviewed. */
  listingId: string;
  /** Reviewer (buyer). */
  userId: string;
  /** Seller of the listing - denormalised for fast aggregates. */
  sellerId: string;
  /** Legacy e-commerce fields. Kept optional so pre-migration records still type-check. */
  productId?: string;
  orderId?: string;
  rating: number;
  datePosted: string | Date;
  purchaseDate: string | Date;
  title?: string;
  comment?: string;
  reviewImages?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type PromoType = "percentage" | "fixed";

export type Promo = {
  _id?: string;
  promoCode: string;
  promoType: PromoType;
  promoValue: number;
  promoStartDate: string | Date;
  promoEndDate: string | Date;
  promoUsageLimit: number;
  promoUsageCount: number;
  totalSales: number;
};

export type IssueType =
  | "product_defect"
  | "wrong_product"
  | "wrong_quantity"
  | "other"
  | "not_received";

export type IssueStatus = "pending" | "resolved" | "closed";

export type Issue = {
  _id?: string;
  userId: string;
  productId: string;
  orderId: string;
  issueType: IssueType;
  issueDescription: string;
  issueDate: string | Date;
  issueStatus?: IssueStatus;
  issueResolution?: string;
  issueResolutionDate?: string | Date;
  issueResolutionImages?: string[];
};

// =========================
// Messaging
// =========================

/**
 * A single message inside a conversation - mirrors `backend/models/messages.ts`.
 */
export type Message = {
  _id?: string;
  chatId: string;
  senderId: string;
  text: string;
  read: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

/**
 * Participant metadata denormalised onto a conversation so the inbox list
 * doesn't have to join on User.
 *
 * NOTE: the backend `role` enum is still the legacy `"user" | "barber" | "admin"`.
 * Surface the marketplace term `"seller"` as an alias until the model is migrated.
 */
export type ChatParticipant = {
  id: string;
  name: string;
  image: string;
  role: "user" | "seller" | "barber" | "admin";
  email?: string;
};

/**
 * Conversation between a buyer and a seller. Mirrors
 * `backend/models/conversations.ts` (the Mongoose model is still named `Chat`
 * and references the legacy `bookingId` / `Barber` refs).
 */
export type Chat = {
  _id?: string;
  participants: string[];
  participantInfo: ChatParticipant[];
  lastMessage?: string;
  lastMessageTime?: string | Date;
  /** @deprecated - mirrors the legacy `bookingId` field. Use `listingId`. */
  bookingId?: string;
  /** Marketplace linkage to the listing the chat is about. */
  listingId?: string;
  chatIsComplete?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

// Convenience alias - most of the app thinks in "conversations".
export type Conversation = Chat;

// =========================
// Payments - transactions, disputes, payouts
// =========================

export type PaymentStatus = "succeeded" | "failed" | "canceled" | "pending";

/**
 * Ledger entry for every successful buyer checkout.
 * Mirrors `backend/models/transactions.ts` (note the capitalised `ListingId`
 * matches the Mongoose schema key - don't rename it without migrating the
 * data).
 */
export type Transaction = {
  _id?: string;
  ListingId: string;
  customerId: string;
  sellerId: string;
  stripePaymentIntentId: string;
  stripeCustomerId: string;
  amountCharged: number;
  amountPaid: number;
  billingReason: string;
  serviceFee: number;
  paymentStatus?: PaymentStatus;
  chargeId?: string;
  currency?: string;
  invoiceUrl?: string;
  hasDispute?: boolean;
  disputeStartDate?: string | Date;
  disputeId?: string;
  paidOut?: boolean;
  payoutDate?: string | Date;
  refundId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type DisputeInitiator = "user" | "seller";
export type DisputeCategory =
  | "no_show"
  | "service_not_provided"
  | "unsafe_environment"
  | "client_behavoir"
  | "seller_behavoir"
  | "incorrect_charge_amount";
export type DisputeStatus =
  | "awaiting_seller_response"
  | "in_review"
  | "awaiting_user_response"
  | "closed";
export type DisputeDecision =
  | "in_favor_seller"
  | "in_favor_user"
  | "settled";
export type DisputeAction = "none" | "refund" | "partial_refund" | "pending";
export type DesiredDisputeAction =
  | "full_refund"
  | "partial_refund"
  | "strike_account";

/** Mirrors `backend/lib/serialize-dispute.ts`. */
export type DisputeRecord = {
  id: string;
  userId: string;
  sellerId: string;
  listingId: string;
  transactionId: string;
  disputeExplanation: string;
  disputeDate: string;
  initiator: DisputeInitiator;
  initiatorName: string;
  amountPaid: number;
  stripePaymentIntentId: string;
  sellerName: string;
  sellerResponse?: string;
  imageOne?: string;
  imageTwo?: string;
  category: DisputeCategory;
  disputeStatus: DisputeStatus;
  decision?: DisputeDecision | null;
  action?: DisputeAction;
  platformResponse?: string;
  desiredAction?: DesiredDisputeAction;
  requestedRefundAmount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type DisputesListResponse = {
  ok?: boolean;
  disputes: DisputeRecord[];
  page: number;
  limit: number;
  totalPages: number;
  totalDisputes: number;
};

export type DisputeDetailResponse = {
  ok?: boolean;
  role: "buyer" | "seller";
  dispute: DisputeRecord;
  listing: {
    id: string;
    appName: string;
    slug: string;
    photos: string[];
    coverIndex: number;
  } | null;
};

export type PayoutStatus = "pending" | "paid" | "failed" | "canceled";

/**
 * Aggregated seller payout covering 1..N `Transaction`s.
 * Mirrors `backend/models/payoutBatch.ts`.
 */
export type PayoutBatch = {
  _id?: string;
  sellerId: string;
  transactions: string[];
  amount: number;
  status: PayoutStatus;
  stripePayoutId?: string | null;
  payoutDate?: string | Date | null;
  currency?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};
