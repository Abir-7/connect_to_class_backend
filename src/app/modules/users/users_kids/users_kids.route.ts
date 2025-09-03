import { Router } from "express";
import { auth } from "../../../middleware/auth/auth";
import { UserKidsController } from "./users_kids.controller";
import { upload } from "../../../middleware/fileUpload/file_upload_handler";
import { parse_data_field } from "../../../middleware/fileUpload/parse_data_field";

const router = Router();

router.post(
  "/add-kids",
  auth("PARENT"),
  upload.single("image"),
  parse_data_field("data"),
  UserKidsController.add_users_kid
);

export const UserKidsRoute = router;
