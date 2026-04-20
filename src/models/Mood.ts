import mongoose, { type Document, Schema } from "mongoose";

export interface IMood extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  mood: string;
  intensity: number;
  notesEncrypted?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const moodSchema = new Schema<IMood>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true, default: Date.now },
    mood: { type: String, required: true },
    intensity: { type: Number, min: 1, max: 10, default: 5 },
    notesEncrypted: String,
  },
  { timestamps: true },
);

moodSchema.index({ userId: 1, date: -1 });

const Mood = mongoose.models.Mood || mongoose.model<IMood>("Mood", moodSchema);

export default Mood;
