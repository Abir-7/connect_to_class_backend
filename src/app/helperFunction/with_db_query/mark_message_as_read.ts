/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Types } from "mongoose";
import { ChatRoomMember } from "../../modules/chat/chat_room_members/chat_room_members.model";

// In-memory queue to batch updates
const readQueue = new Map<string, number>(); // key = chatId:userId, value = timestamp
let flushTimeout: NodeJS.Timeout | null = null;

export const markChatAsRead = (chatId: string, userId: string) => {
  if (!Types.ObjectId.isValid(chatId)) throw new Error("Invalid chat ID");
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID");

  const key = `${chatId}:${userId}`;
  readQueue.set(key, Date.now());

  if (!flushTimeout) {
    flushTimeout = setTimeout(async () => {
      const updates = Array.from(readQueue.entries());
      readQueue.clear();
      flushTimeout = null;

      const bulkOps = updates.map(([queueKey, ts]) => {
        const [qChatId, qUserId] = queueKey.split(":"); // rename inner variables
        return {
          updateOne: {
            filter: {
              chat: new Types.ObjectId(qChatId),
              user: new Types.ObjectId(qUserId),
            },
            update: { $set: { last_read_at: new Date(ts) } },
            upsert: true,
          },
        };
      });

      if (bulkOps.length > 0) {
        try {
          await ChatRoomMember.bulkWrite(bulkOps);
          console.log(`Flushed ${bulkOps.length} last_read updates`);
        } catch (err) {
          console.error("Failed to batch last_read_at:", err);
        }
      }
    }, 1000); // flush every 1 second
  }
};
