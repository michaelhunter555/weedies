import mongoose from "mongoose";

/**
 * One row per early-adopter user. Source of truth for promo enrollment,
 * slot (1–50), and milestone payout flags.
 */
export interface EarlyAdopterGrant {
  userId: mongoose.Types.ObjectId;
  /** 1–50 signup slot. */
  slot: number;
  assignedAt: Date;
  listingApprovedBonusPaid?: boolean;
  listingApprovedBonusPaidAt?: Date | null;
  firstSaleBonusPaid?: boolean;
  firstSaleBonusPaidAt?: Date | null;
}

const EarlyAdopterGrantSchema = new mongoose.Schema<EarlyAdopterGrant>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    slot: { type: Number, required: true, unique: true, min: 1, max: 50 },
    assignedAt: { type: Date, required: true, default: Date.now },
    listingApprovedBonusPaid: { type: Boolean, default: false },
    listingApprovedBonusPaidAt: { type: Date, default: null },
    firstSaleBonusPaid: { type: Boolean, default: false },
    firstSaleBonusPaidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.EarlyAdopterGrant ||
  mongoose.model<EarlyAdopterGrant>("EarlyAdopterGrant", EarlyAdopterGrantSchema);
