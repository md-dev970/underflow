import { pool } from "../config/db.js";
import type { Subscription } from "../types/subscription.types.js";

const mapSubscription = (row: Record<string, unknown>): Subscription => ({
  id: String(row.id),
  userId: String(row.user_id),
  stripeCustomerId: String(row.stripe_customer_id),
  stripeSubscriptionId:
    row.stripe_subscription_id !== null ? String(row.stripe_subscription_id) : null,
  stripePriceId: row.stripe_price_id !== null ? String(row.stripe_price_id) : null,
  status: String(row.status),
  currentPeriodStart:
    row.current_period_start !== null
      ? new Date(String(row.current_period_start))
      : null,
  currentPeriodEnd:
    row.current_period_end !== null ? new Date(String(row.current_period_end)) : null,
  cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
  createdAt: new Date(String(row.created_at)),
  updatedAt: new Date(String(row.updated_at)),
});

export const subscriptionRepository = {
  async findCurrentByUserId(userId: string): Promise<Subscription | null> {
    const result = await pool.query(
      `SELECT id, user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
              status, current_period_start, current_period_end, cancel_at_period_end,
              created_at, updated_at
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId],
    );

    return result.rows[0] ? mapSubscription(result.rows[0]) : null;
  },

  async findByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<Subscription | null> {
    const result = await pool.query(
      `SELECT id, user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
              status, current_period_start, current_period_end, cancel_at_period_end,
              created_at, updated_at
       FROM subscriptions
       WHERE stripe_customer_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [stripeCustomerId],
    );

    return result.rows[0] ? mapSubscription(result.rows[0]) : null;
  },

  async findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<Subscription | null> {
    const result = await pool.query(
      `SELECT id, user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
              status, current_period_start, current_period_end, cancel_at_period_end,
              created_at, updated_at
       FROM subscriptions
       WHERE stripe_subscription_id = $1`,
      [stripeSubscriptionId],
    );

    return result.rows[0] ? mapSubscription(result.rows[0]) : null;
  },

  async upsert(input: {
    userId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    status: string;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  }): Promise<Subscription> {
    if (input.stripeSubscriptionId) {
      const result = await pool.query(
        `INSERT INTO subscriptions (
           user_id,
           stripe_customer_id,
           stripe_subscription_id,
           stripe_price_id,
           status,
           current_period_start,
           current_period_end,
           cancel_at_period_end
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (stripe_subscription_id)
         DO UPDATE SET
           user_id = EXCLUDED.user_id,
           stripe_customer_id = EXCLUDED.stripe_customer_id,
           stripe_price_id = EXCLUDED.stripe_price_id,
           status = EXCLUDED.status,
           current_period_start = EXCLUDED.current_period_start,
           current_period_end = EXCLUDED.current_period_end,
           cancel_at_period_end = EXCLUDED.cancel_at_period_end,
           updated_at = NOW()
         RETURNING id, user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
                   status, current_period_start, current_period_end, cancel_at_period_end,
                   created_at, updated_at`,
        [
          input.userId,
          input.stripeCustomerId,
          input.stripeSubscriptionId,
          input.stripePriceId,
          input.status,
          input.currentPeriodStart,
          input.currentPeriodEnd,
          input.cancelAtPeriodEnd,
        ],
      );

      return mapSubscription(result.rows[0] as Record<string, unknown>);
    }

    const result = await pool.query(
      `INSERT INTO subscriptions (
         user_id,
         stripe_customer_id,
         stripe_subscription_id,
         stripe_price_id,
         status,
         current_period_start,
         current_period_end,
         cancel_at_period_end
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
                 status, current_period_start, current_period_end, cancel_at_period_end,
                 created_at, updated_at`,
      [
        input.userId,
        input.stripeCustomerId,
        input.stripeSubscriptionId,
        input.stripePriceId,
        input.status,
        input.currentPeriodStart,
        input.currentPeriodEnd,
        input.cancelAtPeriodEnd,
      ],
    );

    return mapSubscription(result.rows[0] as Record<string, unknown>);
  },
};
