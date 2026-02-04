import mongoose from "mongoose";

export interface Promo {
  promoCode: string;
  promoType: 'percentage' | 'fixed';
  promoValue: number;
  promoStartDate: Date;
  promoEndDate: Date;
  promoUsageLimit: number;
  promoUsageCount: number;
  totalSales: number;
}  

const PromoSchema = new mongoose.Schema<Promo>({
  promoCode: { type: String, required: true },
  promoType: { type: String, required: true },
  promoValue: { type: Number, required: true },
  promoStartDate: { type: Date, required: true },
  promoEndDate: { type: Date, required: true },
  promoUsageLimit: { type: Number, required: true },
  promoUsageCount: { type: Number, required: true, default: 0 },
  totalSales: { type: Number, required: true, default: 0 },
});

export default mongoose.models.Promo ||
  mongoose.model<Promo>("Promo", PromoSchema);