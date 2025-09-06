import { Router } from "express";
import { auth } from "../../../middleware/auth/auth";
import { LikeController } from "./like.controller";

const router = Router();

router.post(
  "/toggle-comment-like",
  auth("PARENT", "TEACHER"),
  LikeController.toggle_post_like
);

export const LikeRoute = router;
