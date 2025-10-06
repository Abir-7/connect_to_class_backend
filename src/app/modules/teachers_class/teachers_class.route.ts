import { Router } from "express";
import { auth } from "../../middleware/auth/auth";
import { TeachersClassController } from "./teachers_class.controller";
import { upload } from "../../middleware/fileUpload/multer_file_storage/file_upload_handler";
import { parse_data_field } from "../../middleware/fileUpload/multer_file_storage/parse_data_field";
import zod_validator from "../../middleware/zod_validator";
import { zod_teachers_class_schema } from "./teachers_class.validation";
import { UserKidsController } from "../users/users_kids/users_kids.controller";

const router = Router();

router.post(
  "/add-class",
  auth("TEACHER"),
  upload.single("image"),
  parse_data_field("data"),
  zod_validator(zod_teachers_class_schema),
  TeachersClassController.create_teachers_class
);
router.get(
  "/get-teachers-class-list",
  auth("TEACHER"),
  TeachersClassController.get_my_class
);

router.get(
  "/search_parent",
  auth("TEACHER"),
  TeachersClassController.search_users
);

router.post(
  "/add-kids-to-class",
  auth("TEACHER"),
  TeachersClassController.add_kids_to_class
);

router.get(
  "/get-kids-parent-list-of-a-class/:class_id",
  auth("TEACHER"),
  TeachersClassController.get_kids_parent_list_of_a_class
);

router.get(
  "/get-parents-kids/:parent_id",
  auth("TEACHER"),
  UserKidsController.get_parants_kid
);
router.delete(
  "/remove-kids/:class_id",
  auth("TEACHER"),
  TeachersClassController.removeKidsFromClass
);

export const TeachersClassRoute = router;
