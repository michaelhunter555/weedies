import mongoose from "mongoose";

type PriceOptions = "3.5g" | "7g" | "14g" | "28g";

export interface Product {
  name: string;
  description: string;
  priceOptions: {
    [key in PriceOptions]: number;
  }[];
  price: number;
  previousPrice?: number;
  image: string[];
  category: string;
  subCategory: string;
  brand: string;
  stock: number;
  isActive: boolean;
  totalReviews: number;
  averageRating: number;
  sku?: string;
  mood?: string;
  THCa?: number;
  type?: 'Hybrid' | 'Sativa' | 'Indica';
  strain?: string;
}

const ProductSchema = new mongoose.Schema<Product>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  previousPrice: { type: Number, required: false },
  image: { type: [String], required: false, default: [] },
  category: { type: String, required: true },
  subCategory: { type: String, required: true },
  brand: { type: String, required: true },
  stock: { type: Number, required: true },
  isActive: { type: Boolean, required: true, default: true },
  totalReviews: { type: Number, required: true, default: 0 },
  averageRating: { type: Number, required: true, default: 0 },
  sku: { type: String, required: false, default: "" },
  mood: { type: String, required: false, default: "" },
  THCa: { type: Number, required: false, default: 0 },
  type: { type: String, required: false, default: "" },
  strain: { type: String, required: false, default: "" },
}, { timestamps: true });

export default mongoose.models.Product ||
  mongoose.model<Product>("Product", ProductSchema);