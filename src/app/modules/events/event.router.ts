import { Router } from "express";
import { auth } from "../../middleware/auth/auth";
import { upload } from "../../middleware/fileUpload/file_upload_handler";
import { parse_data_field } from "../../middleware/fileUpload/parse_data_field";
import zod_validator from "../../middleware/zod_validator";
import { zod_event_schema } from "./event.validation";
import { EventController } from "./event.controller";

const router = Router();

router.post(
  "/add-event",
  auth("TEACHER"),
  upload.single("image"),
  parse_data_field("data"),
  zod_validator(zod_event_schema),
  EventController.create_event
);

router.get(
  "/get-event-list-of-a-teacher",
  auth("TEACHER"),

  EventController.get_event_list_of_a_teacher
);
export const EventRoute = router;
