import mongoose from "mongoose";

export interface UserBilling extends mongoose.Document {
  userId: mongoose.Schema.Types.ObjectId;

  amountPaid: number;
  billingReason: string;
  purchaseDate: Date;
}

const BillingSchema = new mongoose.Schema<UserBilling>({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  amountPaid: { type: Number, required: false, default: 0 },
  billingReason: { type: String, required: false, default: "" },
  purchaseDate: { type: Date, required: true, default: Date.now },
});

export default mongoose.models.UserBilling ||
  mongoose.model<UserBilling>("UserBilling", BillingSchema);
