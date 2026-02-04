import mongoose from "mongoose";
import { TShippingAddress } from "../types";

export interface User {
  name: string;
  email: string;
  password?: string;
  role: "user" | "admin";
  authProvider: "local" | "firebase" | "google";
  firebaseUid?: string;
  googleSub?: string;
  refreshTokenHash?: string;
  rewardPoints: number;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: Date;
  lastLoginDate?: Date;
  defaultShippingAddress?: TShippingAddress;
  defaultPaymentMethod?: string;
  paymentMethods?: string[];
}

const UserSchema = new mongoose.Schema<User>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: false, default: null },
  role: { type: String, required: true, enum: ["user", "admin"], default: "user" },
  authProvider: { type: String, required: true, enum: ["local", "firebase", "google"], default: "local" },
  firebaseUid: { type: String, required: false, default: null, index: true },
  googleSub: { type: String, required: false, default: null, index: true },
  refreshTokenHash: { type: String, required: false, default: null },
  rewardPoints: { type: Number, required: true, default: 0 },
  totalOrders: { type: Number, required: true, default: 0 },
  totalSpent: { type: Number, required: true, default: 0 },
  lastOrderDate: { type: Date, required: false, default: null },
  lastLoginDate: { type: Date, required: false, default: null },
  defaultShippingAddress: { type: {
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, required: false },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true },
  }, _id: false, required: false, default: null },
}, { timestamps: true });

export default mongoose.models.User ||
  mongoose.model<User>("User", UserSchema);