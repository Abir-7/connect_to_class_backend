import status from "http-status";

import { UserService } from "./user.service";
import send_response from "../../../utils/serverTools/send_response";
import catch_async from "../../../utils/serverTools/catch_async";

const get_my_data = catch_async(async (req, res) => {
  const result = await UserService.get_my_data(req.user.user_id);

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "User data is fetched successfully",
    data: result,
  });
});

export const UserController = {
  get_my_data,
};
