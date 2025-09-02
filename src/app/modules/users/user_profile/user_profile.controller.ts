import status from "http-status";

import { UserProfileService } from "./user_profile.service";
import catch_async from "../../../utils/serverTools/catch_async";
import send_response from "../../../utils/serverTools/send_response";

const update_profile_image = catch_async(async (req, res) => {
  const filePath = req.file?.path;

  const result = await UserProfileService.update_profile_image(
    filePath as string,
    req.user.user_email
  );
  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Profile image changed successfully.",
    data: result,
  });
});

const update_profile_data = catch_async(async (req, res) => {
  const userData = req.body;

  const result = await UserProfileService.update_profile_data(
    userData,
    req.user.user_email
  );
  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Profile info updated successfully.",
    data: result,
  });
});

export const UserProfileController = {
  update_profile_data,
  update_profile_image,
};
