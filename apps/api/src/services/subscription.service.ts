import Stripe from "stripe";

import { getBillingPlanByPriceId } from "../config/billing.js";
import { env } from "../config/env.js";
import { getStripeClient } from "../config/stripe.js";
import { paymentRepository } from "../repositories/payment.repository.js";
import { subscriptionRepository } from "../repositories/subscription.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  CurrentSubscriptionResult,
  PortalSessionResult,
  SubscriptionView,
} from "../types/subscription.types.js";
import { AppError } from "../utils/app-error.js";

const toDate = (unixTimestamp: number | null): Date | null =>
  unixTimestamp ? new Date(unixTimestamp * 1000) : null;

const getStripePriceId = (
  subscription: Stripe.Subscription,
): string | null =>
  subscription.items.data[0]?.price.id ?? null;

const toSubscriptionView = (
  subscription: Awaited<ReturnType<typeof subscriptionRepository.findCurrentByUserId>>,
): SubscriptionView => ({
  subscription,
  plan: subscription?.stripePriceId
    ? getBillingPlanByPriceId(subscription.stripePriceId)
    : null,
});

const getUserIdFromSubscription = async (
  subscription: Stripe.Subscription,
): Promise<string | null> => {
  const metadataUserId = subscription.metadata.userId;

  if (metadataUserId) {
    return metadataUserId;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const existing = await subscriptionRepository.findByStripeCustomerId(customerId);

  return existing?.userId ?? null;
};

export const subscriptionService = {
  async createCheckoutSession(
    userId: string,
    input: CheckoutSessionInput,
  ): Promise<CheckoutSessionResult> {
    const plan = getBillingPlanByPriceId(input.priceId);

    if (!plan) {
      throw new AppError("Unsupported billing price", 400);
    }

    const stripe = getStripeClient();
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const currentSubscription = await subscriptionRepository.findCurrentByUserId(userId);

    let stripeCustomerId = currentSubscription?.stripeCustomerId ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        metadata: {
          userId,
        },
      });

      stripeCustomerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url:
        env.STRIPE_SUCCESS_URL ||
        `${env.CLIENT_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: env.STRIPE_CANCEL_URL || `${env.CLIENT_URL}/billing/cancel`,
      client_reference_id: userId,
      metadata: {
        userId,
      },
      subscription_data: {
        metadata: {
          userId,
        },
      },
    });

    if (!session.url) {
      throw new AppError("Stripe did not return a checkout URL", 502);
    }

    await subscriptionRepository.upsert({
      userId,
      stripeCustomerId,
      stripeSubscriptionId: null,
      stripePriceId: plan.priceId,
      status: "incomplete",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });

    return {
      checkoutUrl: session.url,
    };
  },

  async createPortalSession(userId: string): Promise<PortalSessionResult> {
    const stripe = getStripeClient();
    const currentSubscription = await subscriptionRepository.findCurrentByUserId(userId);

    if (!currentSubscription?.stripeCustomerId) {
      throw new AppError("No Stripe customer found for this user", 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: currentSubscription.stripeCustomerId,
      return_url: env.STRIPE_CANCEL_URL || `${env.CLIENT_URL}/billing`,
    });

    return {
      portalUrl: session.url,
    };
  },

  async getCurrentSubscription(userId: string): Promise<CurrentSubscriptionResult> {
    const subscription = await subscriptionRepository.findCurrentByUserId(userId);

    return toSubscriptionView(subscription);
  },

  async cancelCurrentSubscription(userId: string): Promise<CurrentSubscriptionResult> {
    const stripe = getStripeClient();
    const currentSubscription = await subscriptionRepository.findCurrentByUserId(userId);

    if (!currentSubscription?.stripeSubscriptionId) {
      throw new AppError("No active Stripe subscription found", 404);
    }

    const updatedStripeSubscription = await stripe.subscriptions.update(
      currentSubscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      },
    );

    const subscription = await subscriptionRepository.upsert({
      userId,
      stripeCustomerId:
        typeof updatedStripeSubscription.customer === "string"
          ? updatedStripeSubscription.customer
          : updatedStripeSubscription.customer.id,
      stripeSubscriptionId: updatedStripeSubscription.id,
      stripePriceId: getStripePriceId(updatedStripeSubscription),
      status: updatedStripeSubscription.status,
      currentPeriodStart: toDate(updatedStripeSubscription.current_period_start),
      currentPeriodEnd: toDate(updatedStripeSubscription.current_period_end),
      cancelAtPeriodEnd: updatedStripeSubscription.cancel_at_period_end,
    });

    return toSubscriptionView(subscription);
  },

  async handleStripeWebhook(signature: string | undefined, payload: Buffer): Promise<void> {
    if (!signature) {
      throw new AppError("Missing Stripe signature", 400);
    }

    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new AppError("STRIPE_WEBHOOK_SECRET is not configured", 500);
    }

    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await getUserIdFromSubscription(subscription);

        if (!userId) {
          break;
        }

        await subscriptionRepository.upsert({
          userId,
          stripeCustomerId:
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id,
          stripeSubscriptionId: subscription.id,
          stripePriceId: getStripePriceId(subscription),
          status: subscription.status,
          currentPeriodStart: toDate(subscription.current_period_start),
          currentPeriodEnd: toDate(subscription.current_period_end),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId =
          typeof invoice.subscription === "string" ? invoice.subscription : null;

        if (!stripeSubscriptionId || !invoice.payment_intent) {
          break;
        }

        const subscription = await subscriptionRepository.findByStripeSubscriptionId(
          stripeSubscriptionId,
        );

        if (!subscription) {
          break;
        }

        await paymentRepository.upsert({
          userId: subscription.userId,
          subscriptionId: subscription.id,
          stripePaymentIntentId:
            typeof invoice.payment_intent === "string"
              ? invoice.payment_intent
              : invoice.payment_intent.id,
          amountCents: invoice.amount_paid,
          currency: invoice.currency ?? "usd",
          status: event.type === "invoice.payment_succeeded" ? "paid" : "failed",
          paidAt:
            event.type === "invoice.payment_succeeded"
              ? new Date()
              : null,
        });
        break;
      }

      default:
        break;
    }
  },
};
