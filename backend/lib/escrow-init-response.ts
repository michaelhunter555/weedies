const ESCROW_EMAIL_MESSAGE =
  "Your Escrow checkout is started. Check your inbox for an email from Escrow.com to agree and pay. We will update your order when payment is received.";

export type EscrowInitPayload = {
  ok: true;
  escrowTransactionId: string;
  transactionId: string;
  agreeUrl: string | null;
  /** True when the buyer should continue on Escrow.com via email (no in-app redirect). */
  continueViaEmail: boolean;
  message: string;
  reused: boolean;
};

export function buildEscrowInitResponse(input: {
  escrowTransactionId: string;
  transactionId: string;
  agreeUrl: string | null;
  reused: boolean;
}): EscrowInitPayload {
  const agreeUrl = input.agreeUrl?.trim() || null;
  return {
    ok: true,
    escrowTransactionId: input.escrowTransactionId,
    transactionId: input.transactionId,
    agreeUrl,
    continueViaEmail: !agreeUrl,
    message: agreeUrl
      ? "Continue on Escrow.com to agree and pay."
      : ESCROW_EMAIL_MESSAGE,
    reused: input.reused,
  };
}
