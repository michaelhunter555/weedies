import mongoose from "mongoose";

export interface Admin {
    name: string;
    email: string;
    passwordHash: string;
    refreshTokenHash?: string | null;
    createdAt: Date;
    lastLoginAt: Date;
    latestHistory: {
        action: string;
        timestamp: Date;
    }[];
    role: "superadmin" | "admin";
    permissions: string[];
}

const adminSchema = new mongoose.Schema<Admin>({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    passwordHash: {
        type: String,
        required: true,
    },
    refreshTokenHash: {
        type: String,
        required: false,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    lastLoginAt: {
        type: Date,
        default: Date.now,
    },
    latestHistory: {
        type: [{
            action: String,
            timestamp: Date,
        }],
        default: [],
    },
    role: {
        type: String,
        enum: ["superadmin", "admin"],
        default: "admin",
    },
    permissions: {
        type: [String],
        default: [],
    },
}, { timestamps: true });

export default mongoose.models?.Admin || mongoose.model<Admin>("Admin", adminSchema);