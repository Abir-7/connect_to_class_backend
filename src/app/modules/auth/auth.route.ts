import { Router } from "express";
import { AuthController } from "./auth.controller";
import { auth } from "../../middleware/auth/auth";

import { zodcreate_userSchema } from "./auth.validation";
import zod_validator from "../../middleware/zod_validator";

const router = Router();

router.post(
  "/create-user",
  zod_validator(zodcreate_userSchema),
  AuthController.create_user
);

router.post("/get-access-token", AuthController.get_new_access_token);

router.post("/login", AuthController.user_login);

router.patch("/verify-email", AuthController.verify_email);
router.patch("/verify-reset-code", AuthController.verify_reset);
router.patch(
  "/forgot-password-request",
  AuthController.forgot_password_request
);
router.patch("/reset-password", AuthController.reset_password);
router.patch(
  "/update-password",
  auth("PARENT"),
  AuthController.update_password
);
router.patch("/resend-code", AuthController.re_send_otp);

export const AuthRoute = router;
