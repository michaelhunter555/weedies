const ESCROW_EMAIL_MESSAGE =
  "Your Escrow checkout is started. Check your inbox for an email from Escrow.com to agree and pay. We will update your order when payment is received.";

export type EscrowInitPayload = {
  ok: true;
  escrowTransactionId: string;
  transactionId: string;
  continueViaEmail: true;
  message: string;
  reused: boolean;
};

export function buildEscrowInitResponse(input: {
  escrowTransactionId: string;
  transactionId: string;
  reused: boolean;
}): EscrowInitPayload {
  return {
    ok: true,
    escrowTransactionId: input.escrowTransactionId,
    transactionId: input.transactionId,
    continueViaEmail: true,
    message: ESCROW_EMAIL_MESSAGE,
    reused: input.reused,
  };
}
