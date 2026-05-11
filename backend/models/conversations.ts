import mongoose from 'mongoose';

export interface IParticipantInfo {
    id: mongoose.Types.ObjectId;
    name: string;
    image: string;
    role: 'user' | 'barber' | 'admin';
    pushToken?: string;
  }
  
  export interface IChat extends mongoose.Document {
    participants: mongoose.Types.ObjectId[];
    participantInfo: IParticipantInfo[];
    lastMessage?: string;
    lastMessageTime?: Date;
    bookingId?: mongoose.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
    chatIsComplete?: boolean;
  }
  

const ChatSchema = new mongoose.Schema<IChat>({
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true }
    ],
    participantInfo: [
      {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
        name: { type: String, required: true },
        image: { type: String, required: true },
        role: { type: String, enum: ['user', 'barber', 'admin'], required: true },
        pushToken: { type: String, required: false }
      }
    ],
    lastMessage: { type: String },
    lastMessageTime: { type: Date },
    bookingId: { type: mongoose.Schema.Types.ObjectId, required: false},
    chatIsComplete: { type: Boolean, required: false, default: false }
  }, { timestamps: true });
  
export default mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);