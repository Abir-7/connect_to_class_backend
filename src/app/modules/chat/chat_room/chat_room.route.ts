import { Router } from "express";
import { auth } from "../../../middleware/auth/auth";
import { ChatRoomController } from "./chat_room.controller";

const router = Router();

router.get(
  "/users-chat-list",
  auth("PARENT", "TEACHER"),
  ChatRoomController.get_user_chat_list
);
router.get("/all-message/:chat_room_id", auth("PARENT", "TEACHER"));

export const ChatRoute = router;
