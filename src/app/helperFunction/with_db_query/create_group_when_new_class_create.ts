/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { ClientSession } from "mongoose";
import ChatRoom from "../../modules/chat/chat_room/chat_room.model";
import { ChatRoomMember } from "../../modules/chat/chat_room_members/chat_room_members.model";

export const create_default_class_chats = async (
  classId: string,
  teacherId: string,
  session?: ClientSession
) => {
  const defaultChats = [
    // { type: "group", class: classId },
    { type: "teacher_only", class: classId },
  ];

  // 1️⃣ Create chat rooms
  const chats = await ChatRoom.create(defaultChats, { session, ordered: true });

  // 2️⃣ Add teacher as a member in both chats
  const members = chats.map((chat) => ({
    chat: chat._id,
    user: teacherId,
    type: "teacher",
  }));

  await ChatRoomMember.create(members, { session, ordered: true });

  return chats;
};
