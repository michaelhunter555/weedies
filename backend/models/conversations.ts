import mongoose from "mongoose";

export type ParticipantRole = "user" | "seller" | "customer" | "admin";

export interface IParticipantInfo {
  id: mongoose.Types.ObjectId;
  name: string;
  image: string;
  role: ParticipantRole;
  pushToken?: string;
}

export interface IChat extends mongoose.Document {
  participants: mongoose.Types.ObjectId[];
  participantInfo: IParticipantInfo[];
  /** First sender in the thread; used to mask their name on listing chats until the other party replies. */
  initiatedBy?: mongoose.Types.ObjectId;
  lastMessage?: string;
  lastMessageTime?: Date;
  listingId?: mongoose.Types.ObjectId;
  chatIsComplete?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ChatSchema = new mongoose.Schema<IChat>(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    participantInfo: [
      {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        image: { type: String, required: false, default: "" },
        role: {
          type: String,
          enum: ["user", "seller", "customer", "admin"],
          required: true,
        },
        pushToken: { type: String, required: false },
      },
    ],
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    lastMessage: { type: String },
    lastMessageTime: { type: Date },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: false },
    chatIsComplete: { type: Boolean, required: false, default: false },
  },
  { timestamps: true },
);

export default mongoose.models.Chat || mongoose.model<IChat>("Chat", ChatSchema);
