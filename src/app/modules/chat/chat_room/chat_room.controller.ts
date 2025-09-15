/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChatRoomService } from "./chat_room.service";
import catch_async from "../../../utils/serverTools/catch_async";
import send_response from "../../../utils/serverTools/send_response";
import status from "http-status";
import { get_relative_path } from "../../../middleware/fileUpload/get_relative_path";

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

const get_message_data = catch_async(async (req, res) => {
  const result = await ChatRoomService.get_message_data(req.params.chat_id);

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Chat list fetched succesfully",
    data: result,
  });
});

const send_image = catch_async(async (req, res) => {
  const files = req.files;
  const filePaths = Array.isArray(files)
    ? files.map((file: { path: any }) => get_relative_path(file.path))
    : [];
  const result = await ChatRoomService.send_image(filePaths);

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Image link created.",
    data: result,
  });
});

export const ChatRoomController = {
  get_user_chat_list,
  get_message_data,
  send_image,
};
