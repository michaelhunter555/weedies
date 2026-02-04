import mongoose from "mongoose";

export interface Issue {
  userId: mongoose.Schema.Types.ObjectId;
  productId: mongoose.Schema.Types.ObjectId;
  orderId: mongoose.Schema.Types.ObjectId;
  issueType: 'product_defect' | 'wrong_product' | 'wrong_quantity' | 'other' | 'not_received';
  issueDescription: string;
  issueDate: Date;
  issueStatus: 'pending' | 'resolved' | 'closed';
  issueResolution: string;
  issueResolutionDate: Date;
  issueResolutionImages?: string[];
}  

const IssueSchema = new mongoose.Schema<Issue>({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  issueType: { type: String, required: true },
  issueDescription: { type: String, required: true },
  issueDate: { type: Date, required: true, default: Date.now },
});

export default mongoose.models.Issue ||
  mongoose.model<Issue>("Issue", IssueSchema);