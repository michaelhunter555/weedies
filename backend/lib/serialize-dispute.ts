import type { IDisputes } from "../models/disputes";

export function serializeDispute(doc: IDisputes | Record<string, unknown>) {
  const d = doc as IDisputes & {
    _id?: unknown;
    createdAt?: Date;
    updatedAt?: Date;
  };
  return {
    id: String(d._id),
    userId: String(d.userId),
    sellerId: String(d.sellerId),
    listingId: String(d.listingId),
    transactionId: String(d.transactionId),
    disputeExplanation: d.disputeExplanation,
    disputeDate:
      d.disputeDate instanceof Date
        ? d.disputeDate.toISOString()
        : new Date(d.disputeDate as Date).toISOString(),
    initiator: d.initiator,
    initiatorName: d.initiatorName,
    amountPaid: d.amountPaid,
    stripePaymentIntentId: d.stripePaymentIntentId,
    sellerName: d.sellerName,
    sellerResponse: d.sellerResponse ?? "",
    imageOne: d.imageOne ?? "",
    imageTwo: d.imageTwo ?? "",
    category: d.category,
    disputeStatus: d.disputeStatus,
    decision: d.decision ?? null,
    action: d.action ?? "pending",
    platformResponse: d.platformResponse ?? "",
    desiredAction: d.desiredAction,
    requestedRefundAmount: d.requestedRefundAmount ?? 0,
    createdAt:
      d.createdAt instanceof Date ? d.createdAt.toISOString() : undefined,
    updatedAt:
      d.updatedAt instanceof Date ? d.updatedAt.toISOString() : undefined,
  };
}
