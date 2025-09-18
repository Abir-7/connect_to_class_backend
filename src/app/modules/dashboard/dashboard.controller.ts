import status from "http-status";
import catch_async from "../../utils/serverTools/catch_async";
import send_response from "../../utils/serverTools/send_response";
import { DashboardService } from "./dashboard.service";

const overview_recent_user = catch_async(async (req, res) => {
  const result = await DashboardService.overview_recent_user(
    req.query.type as "last7days" | "lastMonth",
    req.query.search_term as string,
    Number(req.query.page || 1),
    Number(req.query.limit || 10)
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "User data is fetched successfully",
    data: result.recent,
    meta: result.meta,
  });
});
const overview_get_total_users = catch_async(async (req, res) => {
  const result = await DashboardService.overview_get_total_users();

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Total count fetched successfully",
    data: result,
  });
});

const get_all_users = catch_async(async (req, res) => {
  const result = await DashboardService.get_all_users(
    req.query.role as string,
    req.query.search_term as string,
    Number(req.query.page || 1),
    Number(req.query.limit || 10)
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "All user fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const DashboardController = {
  overview_get_total_users,
  overview_recent_user,
  get_all_users,
};
