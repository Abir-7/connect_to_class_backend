import { Router } from "express";
import { auth } from "../../middleware/auth/auth";
import { StripeController } from "./stripe.controller";

const router = Router();

router.post(
  "/create-payment-intent",
  auth("PARENT"),
  StripeController.create_payment_intent
);

export const StripeRoute = router;
