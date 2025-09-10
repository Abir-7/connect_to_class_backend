import { Router } from "express";
import { auth } from "../../../middleware/auth/auth";
import { ChatRoomController } from "./chat_room.controller";

const router = Router();

router.get(
  "/users-chat-list",
  auth("PARENT", "TEACHER"),
  ChatRoomController.get_user_chat_list
);

export const ChatRoute = router;
