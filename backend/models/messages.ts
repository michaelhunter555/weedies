import mongoose from 'mongoose';

interface IMessage extends mongoose.Document {
   chatId: mongoose.Types.ObjectId,
   senderId: mongoose.Types.ObjectId,
   text: string,
   read: boolean;
};

const MessageSchema = new mongoose.Schema<IMessage>({
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
  }, { timestamps: true });
  

export default mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema)