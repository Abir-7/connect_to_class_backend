import { Router } from "express";
import { auth } from "../../../middleware/auth/auth";
import { ChatRoomController } from "./chat_room.controller";
import { upload } from "../../../middleware/fileUpload/multer_file_storage/file_upload_handler";
import { parse_data_field } from "../../../middleware/fileUpload/multer_file_storage/parse_data_field";

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

router.get(
  "/user-list-of-a-chat/:chat_room_id",
  auth("TEACHER", "PARENT"),
  ChatRoomController.get_user_list_of_a_chat
);

router.patch(
  "/edit/:chat_room_id",
  auth("TEACHER"),
  ChatRoomController.edit_chatRoom
);

router.post(
  "/send-image/:chat_id",
  auth("PARENT", "TEACHER"),
  upload.array("images"),
  parse_data_field("data"),
  ChatRoomController.send_image
);
router.post(
  "/send-message/:chat_id",
  auth("PARENT", "TEACHER"),
  ChatRoomController.send_message
);

export const ChatRoute = router;
