import status from "http-status";
import { get_relative_path } from "../../../middleware/fileUpload/get_relative_path";
import catch_async from "../../../utils/serverTools/catch_async";
import send_response from "../../../utils/serverTools/send_response";
import { UserKidsService } from "./users_kids.service";

const add_users_kid = catch_async(async (req, res) => {
  const filePath = req.file?.path;

  const userData = {
    ...req.body,
    ...(filePath && { image: get_relative_path(filePath) }),
    parent: req.user.user_id,
  };

  const result = await UserKidsService.add_users_kids(userData);
  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Kids Profile added successfully.",
    data: result,
  });
});

export const UserKidsController = {
  add_users_kid,
};
