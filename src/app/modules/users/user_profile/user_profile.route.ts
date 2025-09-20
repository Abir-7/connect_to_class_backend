import { Router } from "express";

import { zod_update_profile_schema } from "./user_profile.validation";
import { upload } from "../../../middleware/fileUpload/multer_file_storage/file_upload_handler";
import { auth } from "../../../middleware/auth/auth";
import { UserProfileController } from "./user_profile.controller";
import zod_validator from "../../../middleware/zod_validator";
import { parse_data_field } from "../../../middleware/fileUpload/multer_file_storage/parse_data_field";

const router = Router();

router.patch(
  "/update-profile-image",
  auth("ADMIN", "PARENT", "TEACHER"),
  upload.single("image"),
  UserProfileController.update_profile_image
);

router.patch(
  "/update-profile-data",
  auth("ADMIN", "PARENT", "TEACHER"),
  zod_validator(zod_update_profile_schema),
  UserProfileController.update_profile_data
);
router.patch(
  "/update-profile",
  auth("ADMIN", "PARENT", "TEACHER"),
  upload.single("image"),
  parse_data_field("data"),
  zod_validator(zod_update_profile_schema),
  UserProfileController.update_profile
);

export const UserProfileRoute = router;
