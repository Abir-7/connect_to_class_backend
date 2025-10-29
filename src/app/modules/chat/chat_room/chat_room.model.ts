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
    can_user_send_message: {
      type: Boolean,
      default: function () {
        // `this` refers to the document being created
        return this.type === "individual";
      },
    },
    type: { type: String, enum: chatTypes, required: true },
    last_message: {
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
