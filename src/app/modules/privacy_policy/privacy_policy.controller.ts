import status from "http-status";
import catch_async from "../../utils/serverTools/catch_async";
import send_response from "../../utils/serverTools/send_response";
import { PrivacyService } from "./privacy_policy.service";

const add_or_update_privacy = catch_async(async (req, res) => {
  const result = await PrivacyService.add_or_update_privacy(req.body);

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Privecy updated",
    data: result,
  });
});

const get_privacy = catch_async(async (req, res) => {
  const result = await PrivacyService.get_privacy();
  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Privacy fetched",
    data: result,
  });
});

export const PrivacyController = { add_or_update_privacy, get_privacy };
