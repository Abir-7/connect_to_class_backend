import status from "http-status";
import { get_relative_path } from "../../../middleware/fileUpload/get_relative_path";
import catch_async from "../../../utils/serverTools/catch_async";
import send_response from "../../../utils/serverTools/send_response";
import { UserKidsService } from "./users_kids.service";

const add_users_kid = catch_async(async (req, res) => {
  const filePath = req.file?.path;

  const kids_data = {
    ...req.body,
    ...(filePath && { image: get_relative_path(filePath) }),
    parent: req.user.user_id,
  };

  const result = await UserKidsService.add_users_kids(kids_data);
  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Kids Profile added successfully.",
    data: result,
  });
});

const get_kids_by_parent = catch_async(async (req, res) => {
  const result = await UserKidsService.get_kids_by_parent(req.user.user_id);
  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Kids of a parent added successfully.",
    data: result,
  });
});

export const UserKidsController = {
  add_users_kid,
  get_kids_by_parent,
};
