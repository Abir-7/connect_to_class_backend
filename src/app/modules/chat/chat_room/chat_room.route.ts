import { Router } from "express";
import { auth } from "../../../middleware/auth/auth";
import { ChatRoomController } from "./chat_room.controller";
import { upload } from "../../../middleware/fileUpload/file_upload_handler";
import { parse_data_field } from "../../../middleware/fileUpload/parse_data_field";

const router = Router();

router.get(
  "/users-chat-list",
  auth("PARENT", "TEACHER"),
  ChatRoomController.get_user_chat_list
);
router.get(
  "/all-message/:chat_id",
  auth("PARENT", "TEACHER"),
  ChatRoomController.get_message_data
);

router.post(
  "/send-image/:chat_id",
  auth("PARENT", "TEACHER"),
  upload.array("images"),
  parse_data_field("data"),
  ChatRoomController.send_image
);

export const ChatRoute = router;
