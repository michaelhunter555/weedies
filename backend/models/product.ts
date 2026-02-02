import mongoose from "mongoose";

export interface Product {
  name: string;
  description: string;
  price: number;
  image: string[];
  category: string;
  subCategory: string;
  brand: string;
  stock: number;
  isActive: boolean;
}

const ProductSchema = new mongoose.Schema<Product>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: [String], required: false, default: [] },
  category: { type: String, required: true },
  subCategory: { type: String, required: true },
  brand: { type: String, required: true },
  stock: { type: Number, required: true },
  isActive: { type: Boolean, required: true, default: true },
}, { timestamps: true });

export default mongoose.models.Product ||
  mongoose.model<Product>("Product", ProductSchema);