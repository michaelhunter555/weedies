import mongoose from "mongoose";
import { TShippingAddress } from "../types";

export interface Order {
  userId: mongoose.Schema.Types.ObjectId;
  productId: mongoose.Schema.Types.ObjectId;
  quantity: number;
  price: number;
  totalPrice: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  discountCode?: string;
  orderDate: Date;
  trackingNumber: string;
  shippingAddress: TShippingAddress;
} 

const OrderSchema = new mongoose.Schema<Order>({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  discount: { type: Number, required: false },
  discountType: { type: String, required: false, enum: ['percentage', 'fixed'] },
  discountCode: { type: String, required: false },
  orderDate: { type: Date, required: true, default: Date.now },
  trackingNumber: { type: String, required: true },
  shippingAddress: { type: {
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, required: false },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true },
  }, _id: false, required: true },
});

export default mongoose.models?.Order ||
  mongoose.model<Order>("Order", OrderSchema);