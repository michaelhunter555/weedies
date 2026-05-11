import mongoose from 'mongoose';

export interface ProcessedWebhookEvent extends mongoose.Document {
  eventId: string;
  createdAt: Date;
}

const ProcessedWebhookEventSchema = new mongoose.Schema<ProcessedWebhookEvent>({
  eventId: { type: String, required: true, unique: true, },
  createdAt: { type: Date, default: Date.now, },
});

// Optional: auto-clean after 15 days
ProcessedWebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15 * 24 * 60 * 60 });

export default mongoose.models.ProcessedWebhookEvent
  || mongoose.model<ProcessedWebhookEvent>('ProcessedWebhookEvent', ProcessedWebhookEventSchema);