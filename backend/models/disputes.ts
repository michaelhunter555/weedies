import mongoose from "mongoose";

export interface IDisputes extends mongoose.Document {
    userId: mongoose.Types.ObjectId;
    barberId: mongoose.Types.ObjectId;
    bookingId: mongoose.Types.ObjectId;
    transactionId: mongoose.Types.ObjectId;
    disputeExplanation: string;
    disputeDate: Date;
    initiator: 'user' | 'barber';
    initiatorName: string;
    amountPaid: number;
    stripePaymentIntentId: string;
    barberName: string;
    barberResponse: string;
    imageOne: string;
    imageTwo: string;
    category: 'no_show' | 'service_not_provided' | 'unsafe_environment' | 'client_behavoir' | 'barber_behavoir' | 'incorrect_charge_amount';
    disputeStatus: 'awaiting_barber_response' |'in_review' | 'awaiting_user_response' | 'closed';
    decision: 'in_favor_barber' | 'in_favor_user' | 'settled';
    action: 'none' | 'refund' | 'partial_refund' | 'pending';
    platformResponse: string,
    desiredAction?: 'full_refund' | 'partial_refund' | 'strike_account',
    requestedRefundAmount?: number;
}

const DisputeSchema = new mongoose.Schema<IDisputes>({
    requestedRefundAmount: { type: Number, required: false, default: 0},
    desiredAction: { type: String, required: false, enum: ['full_refund', 'partial_refund', 'strike_account'], },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
    barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true},
    disputeExplanation: { type: String, required: true },
    disputeDate: { type: Date, default: Date.now },
    initiator: { type: String, enum: ['user', 'barber'], required: true },
    initiatorName: { type: String, required: true },
    amountPaid: { type: Number, required: true },
    stripePaymentIntentId: { type: String, required: true },
    barberName: { type: String, required: true },
    barberResponse: { type: String, default: "" },
    imageOne: { type: String, default: "" },
    imageTwo: { type: String, default: "" },
    action: {type: String, enum: ['none', 'refund', 'partial_refund', 'pending'], required: false},
    category: {
      type: String,
      enum: ['no_show', 'service_not_provided', 'unsafe_environment', 'incorrect_charge_amount', 'client_behavoir', 'barber_behavoir'],
      required: true,
    },
    disputeStatus: {
      type: String,
      enum: ['awaiting_barber_response', 'in_review', 'awaiting_user_response', 'closed'],
      default: 'in_review',
    },
    decision: {
      type: String,
      enum: ['in_favor_barber', 'in_favor_user', 'settled'],
      default: null,
    },
    platformResponse: { type: String, required: false, },
  }, { timestamps: true });

export default mongoose.models.Dispute || mongoose.model<IDisputes>("Dispute", DisputeSchema);