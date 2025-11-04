import { Router } from "express";
import { auth } from "../../../middleware/auth/auth";
import { UserKidsController } from "./users_kids.controller";
import { upload } from "../../../middleware/fileUpload/multer_file_storage/file_upload_handler";
import { parse_data_field } from "../../../middleware/fileUpload/multer_file_storage/parse_data_field";
import zod_validator from "../../../middleware/zod_validator";
import { zod_kids_schema } from "./users_kids.validation";

const router = Router();

router.post(
  "/add-kids",
  auth("PARENT"),
  upload.single("image"),
  parse_data_field("data"),
  zod_validator(zod_kids_schema),
  UserKidsController.add_users_kid
);
router.patch(
  "/edit-kid/:kid_id",
  auth("PARENT"),
  upload.single("image"),
  parse_data_field("data"),
  UserKidsController.edit_kids_by_parent
);
router.get(
  "/get-kids-by-parent",
  auth("PARENT"),
  UserKidsController.get_kids_by_parent
);
router.delete(
  "/delete-kid/:kid_id",
  auth("PARENT"),
  UserKidsController.deleteKid
);

export const UserKidsRoute = router;
