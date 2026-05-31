import mongoose from "mongoose";

interface IPayoutBatch extends mongoose.Document {
    sellerId: mongoose.Types.ObjectId;
    transactions: mongoose.Types.ObjectId[];
    amount: number;
    status: 'pending' | 'paid' | 'failed' | 'canceled';
    stripePayoutId?: string | null;
    payoutDate?: Date | null;
    currency?: string | null;
}

const PayoutBatchSchema = new mongoose.Schema<IPayoutBatch>({
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transactions: { type: [mongoose.Schema.Types.ObjectId], ref: 'Transaction', required: true },
    amount: { type: Number, required: true },
    status: { type: String, required: true, enum: ['pending', 'paid', 'failed', 'canceled'] },
    stripePayoutId: { type: String, required: false, default: null },
    payoutDate: { type: Date, required: false, default: null },
    currency: { type: String, required: false, default: null },
}, { timestamps: true });

PayoutBatchSchema.index({ sellerId: 1, createdAt: -1 });

export default mongoose.models.PayoutBatch || mongoose.model<IPayoutBatch>("PayoutBatch", PayoutBatchSchema);