import { model, Schema } from "mongoose";
import { chatTypes, IChatRoom } from "./chat_room.interface";

const chatRoomSchema = new Schema<IChatRoom>(
  {
    class: {
      type: Schema.Types.ObjectId,
      ref: "TeachersClass",
      required: false,
      default: null,
    },
    type: { type: String, enum: chatTypes, required: true },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

const ChatRoom = model<IChatRoom>("ChatRoom", chatRoomSchema);

export default ChatRoom;
