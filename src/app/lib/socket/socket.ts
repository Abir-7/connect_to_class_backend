/* eslint-disable quotes */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server as HttpServer } from "http";

import logger from "../../utils/serverTools/logger";
import { json_web_token } from "../../utils/jwt/jwt";
import { MessageData, SendMessagePayload } from "./data.interface";
import { saveMessage } from "../../helperFunction/with_db_query/save_message_mark_read";

import { Server as SocketIOServer } from "socket.io";
import { markChatAsRead } from "../../helperFunction/with_db_query/mark_message_as_read";

interface User {
  user_id: string;
  socket_id: string;
}

const connectedUsers = new Map<string, User>();
let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // Restrict in production
      methods: ["GET", "POST"],
    },
  });

  // Middleware for JWT verification
  io.use((socket, next) => {
    console.log(socket.handshake);

    let token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers["authorization"] as string | undefined);

    if (!token) {
      logger.warn(`Socket ${socket.id} tried to connect without token`);
      return next(new Error("Authentication error"));
    }

    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    try {
      const payload = json_web_token.decode_jwt_token(token) as any;
      if (!payload?.user_id) throw new Error("Invalid token payload");

      (socket as any).user_id = payload.user_id;
      next();
    } catch (err) {
      logger.warn(`Socket ${socket.id} failed auth: ${err}`);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const user_id = (socket as any).user_id;

    connectedUsers.set(user_id, { user_id, socket_id: socket.id });
    logger.info(`User ${user_id} connected with socket ${socket.id}`);

    //--------------------------- CHAT Part -------------------------

    socket.on("send-message", async (data: SendMessagePayload) => {
      const { chat_id, message_data } = data;
      const withDate: MessageData = {
        ...message_data,
        createdAt: new Date().toISOString(),
        image: Array.isArray(message_data?.image) ? message_data?.image : [],
      };

      //io?.emit(`receive-message`, data);
      io?.emit(`receive-message-${chat_id}`, data);
      //fire and forgot
      saveMessage({
        chat: chat_id,
        sender: withDate.sender._id,
        text: withDate.text,
        images: withDate.image.length > 0 ? withDate.image : [],
      });
    });

    socket.on("message-read", async ({ chatId, userId }) => {
      markChatAsRead(chatId, userId);
    });

    //---------------------------------------------------------------------------
    /* Example:    {
  "chat_id": "68c2a40fc5af026df719edbd",
  "message_data": {
    "sender": {
      "_id": "68b8053f96b1d726cdcdff46",
      "full_name": "John Doe",
      "image": "https://example.com/avatar.jpg"
    },
    "text": "Hello, this is a test message!"
  }
}   */
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
