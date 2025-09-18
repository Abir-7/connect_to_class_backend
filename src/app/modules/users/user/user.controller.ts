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
const overview_recent_user = catch_async(async (req, res) => {
  const result = await UserService.overview_recent_user(
    req.query.type as "last7days" | "lastMonth",
    req.query.search_term as string,
    Number(req.query.limit || 10),
    Number(req.query.page || 1)
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "User data is fetched successfully",
    data: result,
  });
});
const overview_get_total_users = catch_async(async (req, res) => {
  const result = await UserService.overview_get_total_users();

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Total count fetched successfully",
    data: result,
  });
});

export const UserController = {
  get_my_data,
  overview_recent_user,
  overview_get_total_users,
};
