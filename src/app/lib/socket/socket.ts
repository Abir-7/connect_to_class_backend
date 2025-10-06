/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";

import logger from "../../utils/serverTools/logger";
import { json_web_token } from "../../utils/jwt/jwt";
import { saveMessage } from "../../helperFunction/with_db_query/save_message_mark_read";
import { markChatAsRead } from "../../helperFunction/with_db_query/mark_message_as_read";
import { MessageData, SendMessagePayload } from "./data.interface";
import redis from "../redis/redis";

import { sendSingleChat } from "../../helperFunction/with_db_query/emit_chatlist_single_data";

interface User {
  user_id: string;
  socket_id: string;
}

const connectedUsers = new Map<string, User>();
let io: SocketIOServer | null = null;

export const initSocket = async (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    maxHttpBufferSize: 1e6, // 1MB per message
  });

  // ------------------- Redis Adapter -------------------
  const pubClient = redis;
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // ------------------- JWT Auth -------------------
  io.use((socket, next) => {
    try {
      let token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers["authorization"] as string | undefined);
      if (!token) throw new Error("Missing token");
      if (token.startsWith("Bearer ")) token = token.split(" ")[1];

      const payload = json_web_token.decode_jwt_token(token) as any;
      if (!payload?.user_id) throw new Error("Invalid token payload");

      (socket as any).user_id = payload.user_id;
      next();
    } catch (err) {
      logger.warn(`Socket ${socket.id} failed auth: ${err}`);
      next(new Error("Authentication error"));
    }
  });

  // ------------------- Connection -------------------
  io.on("connection", (socket) => {
    const user_id = (socket as any).user_id;
    connectedUsers.set(user_id, { user_id, socket_id: socket.id });
    logger.info(`User ${user_id} connected with socket ${socket.id}`);

    // ------------------- Send Message -------------------
    socket.on("send-message", (data: SendMessagePayload) => {
      const { chat_id, message_data } = data;
      const withDate: MessageData = {
        ...message_data,
        createdAt: new Date().toISOString(),
        image: Array.isArray(message_data?.image) ? message_data.image : [],
      };

      // Emit via Redis adapter across instances
      io?.emit(`receive-message-${chat_id}`, withDate);

      // Fire-and-forget DB save
      saveMessage({
        chat: chat_id,
        sender: withDate.sender._id,
        text: withDate.text,
        images: withDate.image,
      }).catch((err) =>
        logger.error(`Failed to save message in chat ${chat_id}: ${err}`)
      );

      sendSingleChat(
        data.message_data.sender.full_name,
        data.message_data.sender.full_name,
        message_data.sender.image,
        withDate.createdAt!,
        data.chat_id,
        message_data.text,
        message_data.image
      );
    });

    // ------------------- Message Read -------------------
    socket.on("message-read", ({ chatId, userId }) => {
      markChatAsRead(chatId, userId);
    });

    // ------------------- Disconnect -------------------
    socket.on("disconnect", () => {
      connectedUsers.delete(user_id);
      logger.info(`User ${user_id} disconnected from socket ${socket.id}`);
    });
  });

  return io;
};

export const getSocket = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};

export const getConnectedUsers = () => connectedUsers;
