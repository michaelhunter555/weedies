import mongoose from "mongoose";

interface Reviews extends mongoose.Document {
  _id: mongoose.Schema.Types.ObjectId;
  title: string;
  description: string;
  rating: number;
  datePosted: Date;
  PurchaseDate: Date;
}

const ReviewSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  rating: { type: Number, required: true, defualt: 5 },
  datePosted: { type: Date, required: true, default: Date.now },
  purchaseDate: { type: Date, required: true },
});

export default mongoose.models.Review ||
  mongoose.model<Reviews>("Review", ReviewSchema);
