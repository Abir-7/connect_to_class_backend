import status from "http-status";
import catch_async from "../../../utils/serverTools/catch_async";
import send_response from "../../../utils/serverTools/send_response";
import { CommentService } from "./comment.service";

const create_comment = catch_async(async (req, res) => {
  const result = await CommentService.create_comment({
    comment: req.body.comment,
    post_id: req.params.post_id,
    user_id: req.user.user_id,
  });

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Comment added.",
    data: result,
  });
});

const toggle_comment_like = catch_async(async (req, res) => {
  const result = await CommentService.toggle_comment_like(
    req.body.comment_id,
    req.user.user_id
  );

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Like updated",
    data: result,
  });
});

const create_reply = catch_async(async (req, res) => {
  const result = await CommentService.create_reply({
    comment_id: req.body.comment_id,
    reply: req.body.reply,
    user_id: req.user.user_id,
  });

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Reply added.",
    data: result,
  });
});
const delete_comment = catch_async(async (req, res) => {
  const result = await CommentService.delete_comment({
    comment_id: req.params.comment_id,
    user_id: req.user.user_id,
  });

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Comment deleted.",
    data: result,
  });
});

export const CommentController = {
  create_comment,
  toggle_comment_like,
  create_reply,
  delete_comment,
};
