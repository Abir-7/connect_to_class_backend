import { Router } from "express";
import { auth } from "../../middleware/auth/auth";
import { KidsClassController } from "./kids_class.controller";
import { upload } from "../../middleware/fileUpload/file_upload_handler";
import { parse_data_field } from "../../middleware/fileUpload/parse_data_field";
import zod_validator from "../../middleware/zod_validator";
import { zod_kids_class_schema } from "./kids_class.validation";

const router = Router();

router.post(
  "/add-class",
  auth("TEACHER"),
  upload.single("image"),
  parse_data_field("data"),
  zod_validator(zod_kids_class_schema),
  KidsClassController.create_kids_class
);

export const KidsClassRoute = router;
