import mongoose, { type Document, Schema } from "mongoose";

export interface ISymptom extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  symptoms: string[];
  intensity: number;
  notesEncrypted?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const symptomSchema = new Schema<ISymptom>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true, default: Date.now },
    symptoms: { type: [String], default: [] },
    intensity: { type: Number, min: 1, max: 10, default: 5 },
    notesEncrypted: String,
  },
  { timestamps: true },
);

symptomSchema.index({ userId: 1, date: -1 });

const Symptom =
  mongoose.models.Symptom || mongoose.model<ISymptom>("Symptom", symptomSchema);

export default Symptom;
