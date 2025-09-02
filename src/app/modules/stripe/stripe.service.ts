/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable arrow-body-style */
import Stripe from "stripe";
import { app_config } from "../../config";
import logger from "../../utils/serverTools/logger";
import stripe from "./stripe";

const stripe_webhook = async (raw_body: Buffer, sig: string) => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      raw_body,
      sig,
      app_config.payment.stripe.webhook as string
    );
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err}`);
    throw new Error("Webhook signature verification failed.");
  }
  logger.info(event.type);
  // use switch event type
};

const create_payment_intent = async ({
  amount,
  currency,
  customer_id,
}: {
  amount: number;
  currency: string;
  customer_id?: string;
}) => {
  return await stripe.paymentIntents.create({
    amount,
    currency,
    customer: customer_id,
    automatic_payment_methods: { enabled: true }, // ✅ handles cards, wallets, etc.
  });
};

export const StripeService = { stripe_webhook, create_payment_intent };
