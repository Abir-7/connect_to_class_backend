/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import ChatRoom from "../../modules/chat/chat_room/chat_room.model";

import AppError from "../../errors/AppError";
import { markChatAsRead } from "./mark_message_as_read";
import { Message } from "../../modules/chat/message/message.model";

interface SaveMessageParams {
  chat: string;
  sender: string;
  text?: string;
  images?: string[];
}

export const saveMessage = async ({
  chat,
  sender,
  text = "",
  images = [],
}: SaveMessageParams) => {
  // 1️⃣ Minimal check: only _id field is needed
  const chatExists = await ChatRoom.exists({ _id: chat });
  if (!chatExists) throw new AppError(404, "Chat not found");

  // 2️⃣ Save message
  const saved_messagePromise = Message.create({
    chat,
    sender,
    text,
    image: images?.length > 0 ? images : [],
  });

  // 3️⃣ Update chat.last_message asynchronously (fire-and-forget)
  saved_messagePromise.then((saved_message) => {
    ChatRoom.updateOne(
      { _id: chat },
      { $set: { last_message: saved_message._id } }
    ).catch((err) => console.error("Failed to update last_message:", err));

    // 4️⃣ Mark sender as read (batched, non-blocking)
    markChatAsRead(chat, sender);
  });

  // 5️⃣ Return promise immediately so caller can await if needed
  return saved_messagePromise;
};
