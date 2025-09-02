import status from "http-status";

import catch_async from "../../utils/serverTools/catch_async";
import send_response from "../../utils/serverTools/send_response";
import { StripeService } from "./stripe.service";

const stripe_webhook = catch_async(async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const raw_body = req.body;

  const result = await StripeService.stripe_webhook(raw_body, sig);

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Webhook action successful",
    data: result,
  });
});

const create_payment_intent = catch_async(async (req, res) => {
  const { amount, currency } = req.body;

  const result = await StripeService.create_payment_intent({
    amount,
    currency,
    customer_id: req.user.user_id,
  });

  send_response(res, {
    success: true,
    status_code: status.OK,
    message: "Payment intent created successfully",
    data: result,
  });
});

export const StripeController = { stripe_webhook, create_payment_intent };
