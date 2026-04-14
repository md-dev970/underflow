export type BillingPlanKey = "starter" | "pro" | "business";

export interface BillingPlan {
  key: BillingPlanKey;
  name: string;
  priceId: string;
}

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string | null;
  stripePaymentIntentId: string | null;
  amountCents: number;
  currency: string;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
}

export interface CheckoutSessionInput {
  priceId: string;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
}

export interface PortalSessionResult {
  portalUrl: string;
}

export interface CurrentSubscriptionResult {
  subscription: Subscription | null;
  plan: BillingPlan | null;
}

export interface SubscriptionView {
  subscription: Subscription | null;
  plan: BillingPlan | null;
}
