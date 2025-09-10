import { ChatRoomService } from "./chat_room.service";
import catch_async from "../../../utils/serverTools/catch_async";
import send_response from "../../../utils/serverTools/send_response";
import status from "http-status";

const get_user_chat_list = catch_async(async (req, res) => {
  const result = await ChatRoomService.get_user_chat_list(
    req.user.user_id,
    req.user.user_role
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Chat list fetched succesfully",
    data: result,
  });
});

export const ChatRoomController = { get_user_chat_list };
