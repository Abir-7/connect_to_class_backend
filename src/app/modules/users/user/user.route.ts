import { Router } from "express";
import { UserController } from "./user.controller";

import { auth } from "../../../middleware/auth/auth";

const router = Router();

router.get(
  "/me",
  auth("PARENT", "TEACHER", "ADMIN"),
  UserController.get_my_data
);

router.get(
  "/overview-recent-user",
  auth("ADMIN"),
  UserController.overview_recent_user
);
router.get(
  "/overview-total",
  auth("ADMIN"),
  UserController.overview_get_total_users
);

export const UserRoute = router;
