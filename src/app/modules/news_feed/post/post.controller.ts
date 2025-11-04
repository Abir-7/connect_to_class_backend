/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import { get_relative_path } from "../../../middleware/fileUpload/multer_file_storage/get_relative_path";
import catch_async from "../../../utils/serverTools/catch_async";
import send_response from "../../../utils/serverTools/send_response";
import { PostService } from "./post.service";
import AppError from "../../../errors/AppError";
import unlink_file from "../../../middleware/fileUpload/multer_file_storage/unlink_files";

const create_post = catch_async(async (req, res) => {
  const files = req.files as Express.Multer.File[];

  const filePaths = Array.isArray(files)
    ? files.map((file: { path: any }) => get_relative_path(file.path))
    : [];
  const post_data = {
    ...req.body,
  };

  files?.forEach((file) => {
    if (
      !file.mimetype.startsWith("image/") &&
      !file.mimetype.startsWith("video/")
    ) {
      filePaths.forEach((file_path) => unlink_file(file_path));
      throw new AppError(500, "Only image file supported.");
    }
  });

  const result = await PostService.create_post(
    post_data,
    req.user.user_id,
    filePaths
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Post successfully created.",
    data: result,
  });
});

// export const create_post = catch_async(async (req, res) => {
//   const files = req.files as Express.Multer.File[] | undefined;
//   const post_data = { ...req.body };

//   const result = await PostService.create_post(
//     post_data,
//     req.user.user_id,
//     files || []
//   );

//   send_response(res, {
//     success: true,
//     status_code: status.OK,
//     message: "Post successfully created.",
//     data: result,
//   });
// });

const get_all_post = catch_async(async (req, res) => {
  const result = await PostService.get_all_post(
    Number(req.query.page) || 1,
    Number(req.query.limit) || 15,
    req.user.user_id
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "All Post fetched  successfully created.",
    data: result.posts,
    meta: result.meta,
  });
});

const deletePost = catch_async(async (req, res) => {
  const result = await PostService.deletePost(
    req.params.post_id,
    req.user.user_id
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: " Post deleted  successfully.",
    data: result,
  });
});

export const PostController = { create_post, get_all_post, deletePost };
