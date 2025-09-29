/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import ChatRoom from "../../modules/chat/chat_room/chat_room.model";

import AppError from "../../errors/AppError";
import { markChatAsRead } from "./mark_message_as_read";
import { Message } from "../../modules/chat/message/message.model";
import logger from "../../utils/serverTools/logger";

// In-memory queue to batch last_message updates
const lastMessageQueue = new Map<string, string>(); // chatId -> lastMessageId
let flushTimeout: NodeJS.Timeout | null = null;

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
  // 1️⃣ Minimal existence check
  const chatExists = await ChatRoom.exists({ _id: chat });
  if (!chatExists) throw new AppError(404, "Chat not found");

  console.log(text, "FFF");

  // 2️⃣ Save message
  const saved_message = await Message.create({
    chat,
    sender,
    text,
    image: images?.length > 0 ? images : [],
  });

  // 3️⃣ Batch last_message update (non-blocking)
  lastMessageQueue.set(chat, saved_message._id.toString());
  if (!flushTimeout) {
    flushTimeout = setTimeout(async () => {
      const updates = Array.from(lastMessageQueue.entries());
      lastMessageQueue.clear();
      flushTimeout = null;

      const bulkOps = updates.map(([chatId, messageId]) => ({
        updateOne: {
          filter: { _id: chatId },
          update: { $set: { last_message: messageId } },
        },
      }));

      if (bulkOps.length > 0) {
        try {
          await ChatRoom.bulkWrite(bulkOps);
          logger.info(`Flushed ${bulkOps.length} last_message updates`);
        } catch (err) {
          logger.error("Failed to batch update last_message:", err);
        }
      }
    }, 500); // flush every 0.5s
  }

  // 4️⃣ Mark sender as read (batched, non-blocking)
  markChatAsRead(chat, sender);

  // 5️⃣ Return saved message promise
  return saved_message;
};
