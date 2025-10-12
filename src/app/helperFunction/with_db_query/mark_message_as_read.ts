/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Types } from "mongoose";
import { ChatRoomMember } from "../../modules/chat/chat_room_members/chat_room_members.model";

// In-memory queue to batch updates
const readQueue = new Map<string, number>(); // key = chatId:userId, value = timestamp
let flushTimeout: NodeJS.Timeout | null = null;

const FLUSH_INTERVAL_MS = 1000; // flush every 1 second

export const markChatAsRead = (chatId: string, userId: string) => {
  console.log(chatId, "gg");
  if (!Types.ObjectId.isValid(chatId)) throw new Error("Invalid chat IDs");
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID");

  const key = `${chatId}:${userId}`;
  readQueue.set(key, Date.now()); // deduplication: latest timestamp wins

  // Schedule flush if not already scheduled
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushQueue, FLUSH_INTERVAL_MS);
  }
};

// Flush the queue to MongoDB
const flushQueue = async () => {
  flushTimeout = null;

  if (readQueue.size === 0) return;

  const updates = Array.from(readQueue.entries());
  readQueue.clear();

  const bulkOps = updates.map(([queueKey, ts]) => {
    const [qChatId, qUserId] = queueKey.split(":");
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

  if (bulkOps.length === 0) return;

  try {
    await ChatRoomMember.bulkWrite(bulkOps);
    console.log(`Flushed ${bulkOps.length} last_read updates`);
  } catch (err) {
    console.error("Failed to batch last_read_at:", err);
    // Optional: push failed updates back to queue
    updates.forEach(([key, ts]) => readQueue.set(key, ts));
  } finally {
    // If new items arrived during flush, schedule next flush
    if (readQueue.size > 0) {
      flushTimeout = setTimeout(flushQueue, FLUSH_INTERVAL_MS);
    }
  }
};
