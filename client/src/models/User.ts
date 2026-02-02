import mongoose from "mongoose";

import { PaletteMode } from "@mui/material";

export interface UserProps extends mongoose.Document {
  _id: mongoose.Schema.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  signUpDate: string;
  billingHistory?: mongoose.Schema.Types.ObjectId[];
  stripeCustomerId?: string;
  theme: PaletteMode;
}

const UserSchema = new mongoose.Schema<UserProps>(
  {
    theme: { type: String, required: false, default: "dark" },
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    signUpDate: { type: String, required: true, default: "" },
    billingHistory: {
      type: [mongoose.Schema.Types.ObjectId],
      required: false,
      default: [],
    },
    stripeCustomerId: { type: String, required: false, defualt: "" },
  },
  { timestamps: true }
);

export default mongoose.models?.User ||
  mongoose.model<UserProps>("User", UserSchema);
