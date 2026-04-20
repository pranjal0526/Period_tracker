import mongoose, { type Document, Schema } from "mongoose";
import { MAX_LOGICAL_CYCLE_DAYS, MAX_LOGICAL_PERIOD_DAYS } from "@/lib/utils/cycle-calculations";

export interface ICycle extends Document {
  userId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate?: Date | null;
  cycleLength?: number | null;
  periodLength?: number | null;
  flowIntensity?: string | null;
  notesEncrypted?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const cycleSchema = new Schema<ICycle>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: Date, required: true },
    endDate: {
      type: Date,
      validate: {
        validator(this: ICycle, value?: Date | null) {
          if (!value) {
            return true;
          }

          return value >= this.startDate;
        },
        message: "End date cannot be earlier than start date.",
      },
    },
    cycleLength: { type: Number, min: 1, max: MAX_LOGICAL_CYCLE_DAYS },
    periodLength: { type: Number, min: 1, max: MAX_LOGICAL_PERIOD_DAYS },
    flowIntensity: String,
    notesEncrypted: String,
  },
  { timestamps: true },
);

cycleSchema.index({ userId: 1, startDate: -1 });

const Cycle = mongoose.models.Cycle || mongoose.model<ICycle>("Cycle", cycleSchema);

export default Cycle;
