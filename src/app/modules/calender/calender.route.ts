import { Router } from "express";
import { auth } from "../../middleware/auth/auth";
import { CalenderController } from "./calender.controller";

const router = Router();

router.post(
  "/add-event",
  auth("TEACHER", "PARENT"),
  CalenderController.add_calendar_event
);

export const CalenderRouter = router;
