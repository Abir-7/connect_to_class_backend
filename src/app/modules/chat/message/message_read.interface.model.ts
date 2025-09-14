import { model, Schema, Types } from "mongoose";

interface IMessageRead extends Document {
  message: Types.ObjectId;
  user: Types.ObjectId;
  readAt: Date;
}

const messageReadSchema = new Schema<IMessageRead>(
  {
    message: { type: Schema.Types.ObjectId, ref: "Message", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    readAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
messageReadSchema.index({ message: 1, user: 1 }, { unique: true });

export const MessageRead = model<IMessageRead>(
  "MessageRead",
  messageReadSchema
);
