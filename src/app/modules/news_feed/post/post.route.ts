import { Router } from "express";
import { auth } from "../../../middleware/auth/auth";
import { upload } from "../../../middleware/fileUpload/file_upload_handler";
import { parse_data_field } from "../../../middleware/fileUpload/parse_data_field";
import { PostController } from "./post.controller";

const router = Router();

router.post(
  "/add-post",
  auth("TEACHER"),
  upload.array("images"),
  parse_data_field("data"),
  PostController.create_post
);

router.get("/get-all", auth("TEACHER", "PARENT"), PostController.get_all_post);

export const PostRoute = router;
