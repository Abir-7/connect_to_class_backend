import { Router } from "express";
import { CommentController } from "./comment.controller";
import { auth } from "../../../middleware/auth/auth";

const router = Router();

router.post(
  "/new-comment/:post_id",
  auth("TEACHER", "PARENT"),
  CommentController.create_comment
);
router.post(
  "/toggle-comment-like",
  auth("TEACHER", "PARENT"),
  CommentController.toggle_comment_like
);

router.post(
  "/reply-to-comment",
  auth("TEACHER", "PARENT"),
  CommentController.create_reply
);

router.delete(
  "/delete-comment/:comment_id",
  auth("TEACHER", "PARENT"),
  CommentController.delete_comment
);

export const CommentRoute = router;
