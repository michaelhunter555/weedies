import mongoose from "mongoose";

export interface Review {
  listingId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
  sellerId: mongoose.Schema.Types.ObjectId;
  rating: number;
  datePosted: Date;
  purchaseDate: Date;
  title?: string;
  comment?: string;
  reviewImages?: string[];
} 

const ReviewSchema = new mongoose.Schema<Review>({
 listingId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  rating: { type: Number, required: true, default: 5 },
  datePosted: { type: Date, required: true, default: Date.now },
  purchaseDate: { type: Date, required: true },
  title: { type: String, required: false, default: "" },
  comment: { type: String, required: false, default: "" },
}, { timestamps: true });

export default mongoose.models?.Review ||
  mongoose.model<Review>("Review", ReviewSchema);