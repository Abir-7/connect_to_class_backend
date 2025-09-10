import { model, Schema } from "mongoose";
import { IMessage } from "./message.interface";

const messageSchema = new Schema<IMessage>(
  {
    chat: { type: Schema.Types.ObjectId, ref: "ChatRoom", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

// Index for fast retrieval of messages by chat
messageSchema.index({ chat: 1, createdAt: -1 });

export const Message = model<IMessage>("Message", messageSchema);
