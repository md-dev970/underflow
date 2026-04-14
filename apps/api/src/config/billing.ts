import type { BillingPlan, BillingPlanKey } from "../types/subscription.types.js";

const buildPlan = (
  key: BillingPlanKey,
  name: string,
  priceId: string | undefined,
): BillingPlan | null => {
  if (!priceId) {
    return null;
  }

  return {
    key,
    name,
    priceId,
  };
};

const configuredPlans = [
  buildPlan("starter", "Starter", process.env.STRIPE_PRICE_STARTER),
  buildPlan("pro", "Pro", process.env.STRIPE_PRICE_PRO),
  buildPlan("business", "Business", process.env.STRIPE_PRICE_BUSINESS),
].filter((plan): plan is BillingPlan => plan !== null);

export const billingPlans = configuredPlans;

export const getBillingPlanByPriceId = (priceId: string): BillingPlan | null =>
  billingPlans.find((plan) => plan.priceId === priceId) ?? null;
