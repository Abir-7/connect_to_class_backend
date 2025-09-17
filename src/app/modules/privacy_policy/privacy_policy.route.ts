import { Router } from "express";
import { auth } from "../../middleware/auth/auth";
import { PrivacyController } from "./privacy_policy.controller";

const router = Router();
router.post(
  "/add-edit",
  auth("ADMIN"),
  PrivacyController.add_or_update_privacy
);

router.get("/", PrivacyController.get_privacy);
export const PrivacyRouter = router;
