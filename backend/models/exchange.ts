import mongoose from "mongoose";

export type ListingDeliverable = {
  url: string;
  originalName?: string;
  uploadedAt: Date;
};

/**
 * Post-sale handover for a sold listing: payment marker, seller deliverables,
 * buyer confirmation. One document per listing (`listingId` unique).
 */
export interface ListingExchange {
  listingId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  paymentReceivedAt?: Date | null;
  deliverables: ListingDeliverable[];
  buyerConfirmedAt?: Date | null;
  sellerCapturedPayment?: boolean;
  paymentCaptureExpiration?: Date | null;
  paymentStatus?: 'succeeded' | 'failed' | 'canceled' | 'pending';
}

const DeliverableSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    originalName: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ListingExchangeSchema = new mongoose.Schema<ListingExchange>(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      unique: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    paymentReceivedAt: { type: Date, default: null },
    deliverables: { type: [DeliverableSchema], default: [] },
    buyerConfirmedAt: { type: Date, default: null },
    sellerCapturedPayment: { type: Boolean, default: false },
    paymentCaptureExpiration: { type: Date, default: null },
    paymentStatus: {
      type: String,
      enum: ["pending", "succeeded", "canceled", "failed", "captured", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export default mongoose.models.ListingExchange ||
  mongoose.model<ListingExchange>("ListingExchange", ListingExchangeSchema);
