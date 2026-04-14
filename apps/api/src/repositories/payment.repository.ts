import { pool } from "../config/db.js";

export const paymentRepository = {
  async upsert(input: {
    userId: string;
    subscriptionId: string | null;
    stripePaymentIntentId: string;
    amountCents: number;
    currency: string;
    status: string;
    paidAt: Date | null;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO payments (
         user_id,
         subscription_id,
         stripe_payment_intent_id,
         amount_cents,
         currency,
         status,
         paid_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (stripe_payment_intent_id)
       DO UPDATE SET
         subscription_id = EXCLUDED.subscription_id,
         amount_cents = EXCLUDED.amount_cents,
         currency = EXCLUDED.currency,
         status = EXCLUDED.status,
         paid_at = EXCLUDED.paid_at`,
      [
        input.userId,
        input.subscriptionId,
        input.stripePaymentIntentId,
        input.amountCents,
        input.currency,
        input.status,
        input.paidAt,
      ],
    );
  },
};
