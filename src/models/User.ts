import mongoose, { type Document, Schema } from "mongoose";

export interface IUser extends Document {
  email: string;
  name?: string;
  nickname?: string;
  image?: string;
  emailVerified?: Date | null;
  googleId?: string;
  encryptionKey?: string;
  isPartner: boolean;
  themePreference: "light" | "dark";
  notificationPreferences: {
    reminders: boolean;
    fertileWindow: boolean;
    partnerUpdates: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    name: String,
    nickname: String,
    image: String,
    emailVerified: Date,
    googleId: { type: String, unique: true, sparse: true },
    encryptionKey: String,
    isPartner: { type: Boolean, default: false },
    themePreference: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },
    notificationPreferences: {
      reminders: { type: Boolean, default: true },
      fertileWindow: { type: Boolean, default: true },
      partnerUpdates: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
