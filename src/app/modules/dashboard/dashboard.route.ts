import { Router } from "express";
import { auth } from "../../middleware/auth/auth";

import { DashboardController } from "./dashboard.controller";

const router = Router();

router.get(
  "/overview-recent-user",
  auth("ADMIN"),
  DashboardController.overview_recent_user
);

router.get(
  "/overview-total",
  auth("ADMIN"),
  DashboardController.overview_get_total_users
);
router.get("/get-all-user", auth("ADMIN"), DashboardController.get_all_users);
router.get(
  "/get-all-class",
  auth("ADMIN"),
  DashboardController.get_all_class_list
);

router.get(
  "/get-teachers-info-of-class/:class_id",
  auth("ADMIN"),
  DashboardController.get_teacher_info_of_class
);

router.get(
  "/get-class-members/:class_id",
  auth("ADMIN"),
  DashboardController.get_class_members
);
router.get(
  "/get-all-event",
  auth("ADMIN"),
  DashboardController.get_all_event_list
);

export const DashboardRoute = router;
