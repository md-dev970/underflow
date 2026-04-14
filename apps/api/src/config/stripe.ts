import Stripe from "stripe";

import { env } from "./env.js";

let stripeClient: Stripe | null = null;

export const getStripeClient = (): Stripe => {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  stripeClient ??= new Stripe(env.STRIPE_SECRET_KEY);

  return stripeClient;
};
