import { Router } from "express";
import { auth } from "../../../middleware/auth/auth";
import { KidsProgressReportController } from "./kids_progress_report.controller";
import { upload } from "../../../middleware/fileUpload/multer_file_storage/file_upload_handler";
import { parse_data_field } from "../../../middleware/fileUpload/multer_file_storage/parse_data_field";

const router = Router();
router.get(
  "/:kids_id",
  auth("TEACHER", "PARENT"),

  KidsProgressReportController.getKidsReport
);

router.patch(
  "/:kids_id",
  auth("TEACHER"),
  upload.array("files"),
  parse_data_field("data"),
  KidsProgressReportController.addReport
);
router.delete(
  "/:kids_id",
  auth("TEACHER"),

  KidsProgressReportController.removeReport
);

export const KidsProgressReportRoute = router;
