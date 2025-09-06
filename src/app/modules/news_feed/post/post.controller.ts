import status from "http-status";
import { get_relative_path } from "../../../middleware/fileUpload/get_relative_path";
import catch_async from "../../../utils/serverTools/catch_async";
import send_response from "../../../utils/serverTools/send_response";
import { PostService } from "./post.service";

const create_post = catch_async(async (req, res) => {
  const filePath = req.file?.path;

  const post_data = {
    ...req.body,
    ...(filePath && { image: get_relative_path(filePath) }),
  };
  const result = await PostService.create_post(post_data, req.user.user_id);

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Post successfully created.",
    data: result,
  });
});
const get_all_post = catch_async(async (req, res) => {
  const result = await PostService.get_all_post(
    Number(req.query.page) || 1,
    Number(req.query.limit) || 15
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "All Post fetched  successfully created.",
    data: result.posts,
    meta: result.meta,
  });
});

export const PostController = { create_post, get_all_post };
