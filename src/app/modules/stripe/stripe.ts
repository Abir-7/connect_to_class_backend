import Stripe from "stripe";
import { app_config } from "../../config";

export const BILLING_INTERVALS = ["day", "week", "month", "year"] as const;

export type BillingInterval = (typeof BILLING_INTERVALS)[number];

const stripe = new Stripe(app_config.payment.stripe.secret_key as string);

export default stripe;
