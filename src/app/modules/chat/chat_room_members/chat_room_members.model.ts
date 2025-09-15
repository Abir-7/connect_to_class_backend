import { model, Schema } from "mongoose";
import {
  chat_member_type,
  IChatRoomMember,
} from "./chat_room_members.interface";

const chat_room_member_schema = new Schema<IChatRoomMember>(
  {
    chat: { type: Schema.Types.ObjectId, ref: "ChatRoom", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: chat_member_type },
    last_read_at: { type: Date, default: null }, // 👈 last read time pointer
  },
  { timestamps: true }
);

// Ensure unique membership
chat_room_member_schema.index({ chat: 1, user: 1 }, { unique: true });

export const ChatRoomMember = model<IChatRoomMember>(
  "ChatRoomMember",
  chat_room_member_schema
);
