import { Router } from "express";
import { auth } from "../../../middleware/auth/auth";
import { upload } from "../../../middleware/fileUpload/multer_file_storage/file_upload_handler";
import { parse_data_field } from "../../../middleware/fileUpload/multer_file_storage/parse_data_field";
import { PostController } from "./post.controller";
//import { memoryUpload } from "../../../middleware/fileUpload/multer_memory_storage/multer_memory";

const router = Router();

router.post(
  "/add-post",
  auth("TEACHER"),
  upload.array("images"),
  //memoryUpload.array("images"), // use memory storage
  parse_data_field("data"),
  PostController.create_post
);

router.get("/get-all", auth("TEACHER", "PARENT"), PostController.get_all_post);

router.delete(
  "/delete-post/:post_id",
  auth("TEACHER"),
  PostController.deletePost
);

export const PostRoute = router;
