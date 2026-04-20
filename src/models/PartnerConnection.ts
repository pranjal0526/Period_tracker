import mongoose, { type Document, Schema } from "mongoose";

interface IPermissions {
  canViewCalendar: boolean;
  canViewSymptoms: boolean;
  canViewMoods: boolean;
  canReceiveNotifications: boolean;
  canSendMessages: boolean;
}

export interface IPartnerConnection extends Document {
  primaryUserId: mongoose.Types.ObjectId;
  partnerUserId?: mongoose.Types.ObjectId | null;
  accessCode: string;
  consentGiven: boolean;
  consentDate?: Date | null;
  permissions: IPermissions;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const partnerConnectionSchema = new Schema<IPartnerConnection>(
  {
    primaryUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    partnerUserId: { type: Schema.Types.ObjectId, ref: "User" },
    accessCode: { type: String, unique: true, required: true },
    consentGiven: { type: Boolean, default: false },
    consentDate: Date,
    permissions: {
      canViewCalendar: { type: Boolean, default: false },
      canViewSymptoms: { type: Boolean, default: false },
      canViewMoods: { type: Boolean, default: false },
      canReceiveNotifications: { type: Boolean, default: true },
      canSendMessages: { type: Boolean, default: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

partnerConnectionSchema.index(
  { primaryUserId: 1, partnerUserId: 1 },
  { unique: true, sparse: true },
);

const PartnerConnection =
  mongoose.models.PartnerConnection ||
  mongoose.model<IPartnerConnection>("PartnerConnection", partnerConnectionSchema);

export default PartnerConnection;
