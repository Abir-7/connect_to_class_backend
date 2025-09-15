import { Router } from "express";
import { UserController } from "./user.controller";

import { auth } from "../../../middleware/auth/auth";

const router = Router();

router.get(
  "/me",
  auth("PARENT", "TEACHER", "ADMIN"),
  UserController.get_my_data
);

export const UserRoute = router;
