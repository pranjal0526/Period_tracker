import mongoose, { type Document, Schema } from "mongoose";

export interface IMessage extends Document {
  connectionId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  contentEncrypted: string;
  sentAt: Date;
  seenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    connectionId: {
      type: Schema.Types.ObjectId,
      ref: "PartnerConnection",
      required: true,
    },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    contentEncrypted: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    seenAt: Date,
  },
  { timestamps: true },
);

messageSchema.index({ connectionId: 1, sentAt: -1 });

const Message =
  mongoose.models.Message || mongoose.model<IMessage>("Message", messageSchema);

export default Message;
