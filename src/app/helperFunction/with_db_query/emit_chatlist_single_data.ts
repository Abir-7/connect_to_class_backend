/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSocket } from "../../lib/socket/socket";
import ChatRoom from "../../modules/chat/chat_room/chat_room.model";
import { ChatRoomMember } from "../../modules/chat/chat_room_members/chat_room_members.model";

export const sendSingleChat = async (
  sender: string,
  sender_id: string,
  sender_image: string,
  sending_time: string,
  chat_id: string,
  last_message: string,
  last_message_image: string[]
) => {
  const chat_data = (await ChatRoom.findById(chat_id)
    .populate("class")
    .lean()) as any;

  const chat_members = await ChatRoomMember.find({ chat: chat_id }).select(
    "user"
  );

  const io = getSocket();

  const chatListData = {
    sender_id: sender_id,
    sender:
      chat_data?.type === "individual"
        ? sender
        : chat_data?.class?.class_name || "",
    sender_image:
      chat_data?.type === "individual"
        ? sender_image
        : chat_data?.class?.image || "",
    sending_time: sending_time,
    chat_id: chat_id,
    type: chat_data?.type,
    last_message,
    last_message_image,
    total_unread: 1,
  };

  chat_members.map((mem) => {
    io.emit(`chat-list-${mem.user}`, chatListData);
  });
};
