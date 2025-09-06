import status from "http-status";
import catch_async from "../../../utils/serverTools/catch_async";
import send_response from "../../../utils/serverTools/send_response";
import { LikeService } from "./like.service";

const toggle_post_like = catch_async(async (req, res) => {
  const result = await LikeService.toggle_post_like(
    req.params.post_id,
    req.user.user_id
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Like toggled.",
    data: result,
  });
});

export const LikeController = {
  toggle_post_like,
};
