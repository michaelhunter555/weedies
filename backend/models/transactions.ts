import mongoose from "mongoose";

export interface ITransaction extends mongoose.Document {
  ListingId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  amountCharged: number; // <--- amount paid to barber - service fee
  amountPaid: number;
  
  billingReason: string;
  serviceFee: number;
  paymentStatus?: 'succeeded' | 'failed' | 'canceled' | 'pending';
  chargeId?: string;
  currency?: string;
  invoiceUrl?: string;
  hasDispute?: boolean;
  disputeStartDate?: Date | string;
  disputeId?: mongoose.Schema.Types.ObjectId;
  paidOut?: boolean;
  payoutDate?: Date;
  refundId?: string;
  escrowTransactionId?: string;
  paymentType?: 'stripe' | 'escrow';
}

const TransactionSchema = new mongoose.Schema<ITransaction>({
  ListingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  stripePaymentIntentId: { type: String, required: false, default: "" },
  stripeCustomerId: { type: String, required: false, default: "" },
  serviceFee: { type: Number, required: true,},
  chargeId: { type: String, required: false, },
  refundId: { type: String, required: false, },
  amountCharged: { type: Number, required: true },
  amountPaid: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['succeeded', 'failed', 'canceled', 'pending'], required: false},
  billingReason: { type: String, required: false, default: "" },
  hasDispute: { type: Boolean, required: false, default: false},
  disputeStartDate: { type: Date, required: false, },
  disputeId: { type: mongoose.Schema.Types.ObjectId, required: false},
  paidOut: { type: Boolean, required: false, default: false },
  payoutDate: { type: Date, required: false,},
  escrowTransactionId: { type: String, required: false, },
  paymentType: { type: String, enum: ['stripe', 'escrow'], required: false, default: 'stripe' },
}, { timestamps: true });

TransactionSchema.index(
  { refundId: 1 },
  {
    unique: true,
    partialFilterExpression: { refundId: { $exists: true, $ne: null } }
  }
);

TransactionSchema.index(
  { chargeId: 1 },
  {
    unique: true,
    partialFilterExpression: { chargeId: { $exists: true, $ne: null } }
  }
);


export default mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);