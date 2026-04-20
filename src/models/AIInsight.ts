import mongoose, { type Document, Schema } from "mongoose";

export interface IAIInsight extends Document {
  userId: mongoose.Types.ObjectId;
  summary: string;
  recommendations: string[];
  anomalies: Array<{
    type: string;
    severity: string;
    message: string;
    recommendation?: string;
  }>;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const aiInsightSchema = new Schema<IAIInsight>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    summary: { type: String, required: true },
    recommendations: { type: [String], default: [] },
    anomalies: {
      type: [
        {
          type: { type: String, required: true },
          severity: { type: String, required: true },
          message: { type: String, required: true },
          recommendation: String,
        },
      ],
      default: [],
    },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

aiInsightSchema.index({ userId: 1, generatedAt: -1 });

const AIInsight =
  mongoose.models.AIInsight || mongoose.model<IAIInsight>("AIInsight", aiInsightSchema);

export default AIInsight;
