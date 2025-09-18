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

export const DashboardRoute = router;
