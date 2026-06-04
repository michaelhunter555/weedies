/**
 * Escrow.com API client.
 * - Development: sandbox API + integration helper by default.
 * - Production (`NODE_ENV=production`): live API + www.escrow.com unless overridden.
 * @see https://www.escrow.com/api/docs/basics
 * @see https://www.escrow-sandbox.com/api/docs/create-transaction
 */

const SANDBOX_API_BASE = "https://api.escrow-sandbox.com/2017-09-01";
const PRODUCTION_API_BASE = "https://api.escrow.com/2017-09-01";

/** Sandbox-only — simulates funding in dev; not used for live buyer payments. */
const SANDBOX_INTEGRATION_BASE =
  "https://integrationhelper.escrow-sandbox.com/v1";

export const ESCROW_SANDBOX_WEB_ORIGIN = "https://www.escrow-sandbox.com";
export const ESCROW_PRODUCTION_WEB_ORIGIN = "https://www.escrow.com";

/** API host when `ESCROW_API_BASE_URL` is unset. */
export function defaultEscrowApiBaseUrl(): string {
  if (process.env.ESCROW_API_BASE_URL?.trim()) {
    return process.env.ESCROW_API_BASE_URL.trim();
  }
  return process.env.NODE_ENV === "production"
    ? PRODUCTION_API_BASE
    : SANDBOX_API_BASE;
}

/** Party dashboard links when `ESCROW_WEB_ORIGIN` is unset. */
export function defaultEscrowWebOrigin(): string {
  if (process.env.ESCROW_WEB_ORIGIN?.trim()) {
    return process.env.ESCROW_WEB_ORIGIN.trim().replace(/\/$/, "");
  }
  return process.env.NODE_ENV === "production"
    ? ESCROW_PRODUCTION_WEB_ORIGIN
    : ESCROW_SANDBOX_WEB_ORIGIN;
}

// --- Request / response shapes (Escrow API 2017-09-01) ---

export type EscrowPartyRole = "buyer" | "seller" | "broker" | "partner";

/** Customer email or the literal `"me"` for the authenticated API user. */
export type EscrowCustomerRef = "me" | (string & {});

export type EscrowCurrency = "usd" | "aud" | "euro" | "gbp" | "cad";

export type EscrowItemType =
  | "domain_name"
  | "domain_name_holding"
  | "general_merchandise"
  | "milestone"
  | "motor_vehicle"
  | "broker_fee"
  | "partner_fee"
  | "shipping_fee"
  | "mobile_apps"
  | "business_and_internet";

export type EscrowFeeType =
  | "cheque_disbursement"
  | "escrow"
  | "paypal_deposit"
  | "creditcard_deposit"
  | "wire_disbursement";

export interface EscrowParty {
  role: EscrowPartyRole;
  customer: EscrowCustomerRef;
  visibility?: { hidden_from: EscrowCustomerRef[] };
}

export interface EscrowSchedule {
  amount: number;
  payer_customer: EscrowCustomerRef;
  beneficiary_customer: EscrowCustomerRef;
  /** Required for domain_name_holding and milestone multi-pay schedules. */
  due_date?: string;
}

export interface EscrowFeeScheduleInput {
  payer_customer: EscrowCustomerRef;
  type: EscrowFeeType;
  /**
   * Only on create for type `escrow` (do not pass `amount`). Splits across fee rows
   * must sum to 1.0. Valid values: 0.5 (50%) or 1 (100%).
   */
  split?: 0.5 | 1;
}

export interface EscrowItemExtraAttributes {
  image_url?: string;
  merchant_url?: string;
  with_content?: boolean;
  concierge?: boolean;
  term_period?: number;
  vin?: string;
  odometer?: string;
  year?: number;
  make?: string;
  model?: string;
  title_collection?: boolean;
  lien_holder_payoff?: boolean;
}

export interface EscrowTransactionItemInput {
  title?: string;
  description: string;
  type: EscrowItemType;
  inspection_period?: number;
  quantity?: number;
  shipping_type?: "no_shipping";
  category?: string;
  schedule: EscrowSchedule[];
  extra_attributes?: EscrowItemExtraAttributes;
  fees?: EscrowFeeScheduleInput[];
  visibility?: { hidden_from: EscrowCustomerRef[] };
}

/** POST /transaction body */
export interface CreateEscrowTransactionRequest {
  parties: EscrowParty[];
  currency: EscrowCurrency;
  description: string;
  items: EscrowTransactionItemInput[];
}

/** PATCH /transaction/:id body */
export interface AgreeToEscrowTransactionRequest {
  action: "agree";
}

/** POST integration helper .../payments_in body */
export type EscrowPaymentInMethod =
  | "wire_transfer"
  | "credit_card"
  | "paypal"
  | "ach"
  | "check";

export interface ApproveEscrowPaymentInRequest {
  method: EscrowPaymentInMethod;
  /** Decimal string, e.g. `"406.00"` */
  amount: string;
}

export interface EscrowWebhookRegistration {
  id: number;
  url: string;
}

export interface EscrowWebhookListResponse {
  webhooks: EscrowWebhookRegistration[];
}

/** Inbound POST from Escrow.com */
export interface EscrowWebhookPayload {
  event: string;
  event_type: "transaction";
  transaction_id: number;
}

// --- Response shapes (subset; API returns more fields) ---

export interface EscrowPartyResponse {
  customer: string;
  agreed: boolean;
  role: EscrowPartyRole;
}

export interface EscrowScheduleStatus {
  secured?: boolean;
}

export interface EscrowScheduleResponse {
  amount: string;
  payer_customer: string;
  beneficiary_customer: string;
  due_date?: string;
  status?: EscrowScheduleStatus;
}

export interface EscrowFeeResponse {
  payer_customer: string;
  amount: string;
  type: EscrowFeeType;
}

export interface EscrowItemStatus {
  received?: boolean;
  rejected_returned?: boolean;
  rejected?: boolean;
  received_returned?: boolean;
  shipped?: boolean;
  accepted?: boolean;
  shipped_returned?: boolean;
  accepted_returned?: boolean;
  canceled?: boolean;
}

export interface EscrowTransactionItemResponse {
  id: number;
  title?: string;
  description: string;
  type: EscrowItemType;
  inspection_period?: number;
  quantity?: number;
  schedule: EscrowScheduleResponse[];
  fees?: EscrowFeeResponse[];
  extra_attributes?: EscrowItemExtraAttributes;
  status?: EscrowItemStatus;
}

export interface EscrowTransactionResponse {
  id: number;
  currency: EscrowCurrency;
  description: string;
  parties: EscrowPartyResponse[];
  items: EscrowTransactionItemResponse[];
  creation_date?: string;
  close_date?: string | null;
  is_cancelled?: boolean;
}

/** PATCH /transaction/:id — cancel */
export interface CancelEscrowTransactionRequest {
  action: "cancel";
  cancel_information?: {
    cancellation_reason?: string;
  };
}

// --- Config & HTTP ---

export interface EscrowApiConfig {
  email: string;
  apiKey: string;
  /** Integration helper may use a separate password; defaults to apiKey. */
  integrationPassword?: string;
  apiBaseUrl?: string;
  integrationBaseUrl?: string;
}

export class EscrowApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "EscrowApiError";
    this.status = status;
    this.body = body;
  }
}

function getEscrowConfig(): EscrowApiConfig {
  const email = process.env.ESCROW_API_EMAIL?.trim();
  const apiKey = process.env.ESCROW_API_KEY?.trim();
  if (!email || !apiKey) {
    throw new Error(
      "Escrow API is not configured. Set ESCROW_API_EMAIL and ESCROW_API_KEY.",
    );
  }
  return {
    email,
    apiKey,
    integrationPassword:
      process.env.ESCROW_INTEGRATION_PASSWORD?.trim() || apiKey,
    apiBaseUrl: defaultEscrowApiBaseUrl(),
    integrationBaseUrl:
      process.env.ESCROW_INTEGRATION_BASE_URL?.trim() ||
      SANDBOX_INTEGRATION_BASE,
  };
}

function basicAuthHeader(email: string, secret: string): string {
  const token = Buffer.from(`${email}:${secret}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function escrowRequest<T>(
  url: string,
  init: RequestInit & {
    authSecret: string;
    email: string;
    extraHeaders?: Record<string, string>;
  },
): Promise<T> {
  const { authSecret, email, extraHeaders, ...fetchInit } = init;
  const headers = new Headers(fetchInit.headers);
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers.set(key, value);
    }
  }
  headers.set(
    "Authorization",
    basicAuthHeader(email, authSecret),
  );
  if (!headers.has("Content-Type") && fetchInit.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...fetchInit, headers });
  const body = await parseJsonSafe(res);

  if (!res.ok) {
    const msg =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Escrow API error (${res.status})`;
    throw new EscrowApiError(msg, res.status, JSON.stringify(body));
  }

  return body as T;
}

function apiBase(config: EscrowApiConfig): string {
  return (config.apiBaseUrl ?? defaultEscrowApiBaseUrl()).replace(/\/$/, "");
}

function integrationBase(config: EscrowApiConfig): string {
  return (config.integrationBaseUrl ?? SANDBOX_INTEGRATION_BASE).replace(
    /\/$/,
    "",
  );
}

// --- Public API ---

/**
 * Create an Escrow transaction.
 * POST /transaction
 */
export async function createEscrowTransaction(
  payload: CreateEscrowTransactionRequest,
  config: EscrowApiConfig = getEscrowConfig(),
): Promise<EscrowTransactionResponse> {
  return escrowRequest<EscrowTransactionResponse>(
    `${apiBase(config)}/transaction`,
    {
      method: "POST",
      email: config.email,
      authSecret: config.apiKey,
      body: JSON.stringify(payload),
    },
  );
}

/**
 * Agree to a transaction on behalf of the authenticated API user.
 * PATCH /transaction/:transactionId
 */
export async function agreeToEscrowTransaction(
  transactionId: number | string,
  config: EscrowApiConfig = getEscrowConfig(),
): Promise<EscrowTransactionResponse> {
  const body: AgreeToEscrowTransactionRequest = { action: "agree" };
  return escrowRequest<EscrowTransactionResponse>(
    `${apiBase(config)}/transaction/${transactionId}`,
    {
      method: "PATCH",
      email: config.email,
      authSecret: config.apiKey,
      body: JSON.stringify(body),
    },
  );
}

/**
 * Cancel a transaction (before both parties have agreed and funds are secured).
 * PATCH /transaction/:transactionId
 */
export async function cancelEscrowTransaction(
  transactionId: number | string,
  cancellationReason?: string,
  config: EscrowApiConfig = getEscrowConfig(),
): Promise<EscrowTransactionResponse> {
  const body: CancelEscrowTransactionRequest = {
    action: "cancel",
    cancel_information: {
      cancellation_reason:
        cancellationReason?.trim() ||
        "A party cancelled the transaction on the marketplace.",
    },
  };
  return escrowRequest<EscrowTransactionResponse>(
    `${apiBase(config)}/transaction/${transactionId}`,
    {
      method: "PATCH",
      email: config.email,
      authSecret: config.apiKey,
      body: JSON.stringify(body),
    },
  );
}

/**
 * Approve / record an incoming payment (Integration Helper).
 * POST /transaction/:transactionId/payments_in
 */
export async function approveEscrowPaymentIn(
  transactionId: number | string,
  payload: ApproveEscrowPaymentInRequest,
  config: EscrowApiConfig = getEscrowConfig(),
): Promise<unknown> {
  const secret = config.integrationPassword ?? config.apiKey;
  return escrowRequest<unknown>(
    `${integrationBase(config)}/transaction/${transactionId}/payments_in`,
    {
      method: "POST",
      email: config.email,
      authSecret: secret,
      body: JSON.stringify(payload),
    },
  );
}

/** Fetch transaction details. GET /transaction/:transactionId */
export async function getEscrowTransaction(
  transactionId: number | string,
  config: EscrowApiConfig = getEscrowConfig(),
): Promise<EscrowTransactionResponse> {
  return escrowRequest<EscrowTransactionResponse>(
    `${apiBase(config)}/transaction/${transactionId}`,
    {
      method: "GET",
      email: config.email,
      authSecret: config.apiKey,
    },
  );
}

/** POST /customer/me/webhook */
export async function registerEscrowWebhook(
  url: string,
  config: EscrowApiConfig = getEscrowConfig(),
): Promise<EscrowWebhookRegistration> {
  return escrowRequest<EscrowWebhookRegistration>(
    `${apiBase(config)}/customer/me/webhook`,
    {
      method: "POST",
      email: config.email,
      authSecret: config.apiKey,
      body: JSON.stringify({ url }),
    },
  );
}

/** GET /customer/me/webhook */
export async function listEscrowWebhooks(
  config: EscrowApiConfig = getEscrowConfig(),
): Promise<EscrowWebhookListResponse> {
  return escrowRequest<EscrowWebhookListResponse>(
    `${apiBase(config)}/customer/me/webhook`,
    {
      method: "GET",
      email: config.email,
      authSecret: config.apiKey,
    },
  );
}

/** DELETE /customer/me/webhook/:webhookId */
export async function deleteEscrowWebhook(
  webhookId: number | string,
  config: EscrowApiConfig = getEscrowConfig(),
): Promise<void> {
  await escrowRequest<unknown>(
    `${apiBase(config)}/customer/me/webhook/${webhookId}`,
    {
      method: "DELETE",
      email: config.email,
      authSecret: config.apiKey,
    },
  );
}

export function isEscrowApiConfigured(): boolean {
  return Boolean(
    process.env.ESCROW_API_EMAIL?.trim() &&
      process.env.ESCROW_API_KEY?.trim(),
  );
}
