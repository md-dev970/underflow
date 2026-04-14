import { pool } from "../config/db.js";
import type {
  BudgetAlert,
  CreateBudgetAlertInput,
  UpdateBudgetAlertInput,
} from "../types/alert.types.js";

const mapAlert = (row: Record<string, unknown>): BudgetAlert => ({
  id: String(row.id),
  workspaceId: String(row.workspace_id),
  awsAccountId: row.aws_account_id ? String(row.aws_account_id) : null,
  name: String(row.name),
  thresholdAmount: Number(row.threshold_amount),
  currency: String(row.currency),
  period: String(row.period),
  recipientEmail: String(row.recipient_email),
  isActive: Boolean(row.is_active),
  createdAt: new Date(String(row.created_at)),
  updatedAt: new Date(String(row.updated_at)),
});

export const alertRepository = {
  async create(workspaceId: string, input: CreateBudgetAlertInput): Promise<BudgetAlert> {
    const result = await pool.query(
      `INSERT INTO budget_alerts (
         workspace_id, aws_account_id, name, threshold_amount, currency, period, recipient_email
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, workspace_id, aws_account_id, name, threshold_amount, currency,
                 period, recipient_email, is_active, created_at, updated_at`,
      [
        workspaceId,
        input.awsAccountId ?? null,
        input.name,
        input.thresholdAmount,
        input.currency ?? "USD",
        input.period ?? "monthly",
        input.recipientEmail,
      ],
    );

    return mapAlert(result.rows[0] as Record<string, unknown>);
  },

  async findManyByWorkspaceId(workspaceId: string): Promise<BudgetAlert[]> {
    const result = await pool.query(
      `SELECT id, workspace_id, aws_account_id, name, threshold_amount, currency,
              period, recipient_email, is_active, created_at, updated_at
       FROM budget_alerts
       WHERE workspace_id = $1
       ORDER BY created_at ASC`,
      [workspaceId],
    );

    return result.rows.map((row) => mapAlert(row as Record<string, unknown>));
  },

  async findById(id: string): Promise<BudgetAlert | null> {
    const result = await pool.query(
      `SELECT id, workspace_id, aws_account_id, name, threshold_amount, currency,
              period, recipient_email, is_active, created_at, updated_at
       FROM budget_alerts
       WHERE id = $1`,
      [id],
    );

    return result.rows[0] ? mapAlert(result.rows[0]) : null;
  },

  async updateById(id: string, input: UpdateBudgetAlertInput): Promise<BudgetAlert> {
    const fields: string[] = [];
    const values: Array<string | number | boolean> = [];

    if (input.name !== undefined) {
      fields.push(`name = $${values.length + 1}`);
      values.push(input.name);
    }

    if (input.thresholdAmount !== undefined) {
      fields.push(`threshold_amount = $${values.length + 1}`);
      values.push(input.thresholdAmount);
    }

    if (input.currency !== undefined) {
      fields.push(`currency = $${values.length + 1}`);
      values.push(input.currency);
    }

    if (input.period !== undefined) {
      fields.push(`period = $${values.length + 1}`);
      values.push(input.period);
    }

    if (input.recipientEmail !== undefined) {
      fields.push(`recipient_email = $${values.length + 1}`);
      values.push(input.recipientEmail);
    }

    if (input.isActive !== undefined) {
      fields.push(`is_active = $${values.length + 1}`);
      values.push(input.isActive);
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE budget_alerts
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, workspace_id, aws_account_id, name, threshold_amount, currency,
                 period, recipient_email, is_active, created_at, updated_at`,
      values,
    );

    return mapAlert(result.rows[0] as Record<string, unknown>);
  },

  async deleteById(id: string): Promise<void> {
    await pool.query(`DELETE FROM budget_alerts WHERE id = $1`, [id]);
  },

  async findActive(): Promise<BudgetAlert[]> {
    const result = await pool.query(
      `SELECT id, workspace_id, aws_account_id, name, threshold_amount, currency,
              period, recipient_email, is_active, created_at, updated_at
       FROM budget_alerts
       WHERE is_active = TRUE`,
    );

    return result.rows.map((row) => mapAlert(row as Record<string, unknown>));
  },

  async createAlertEvent(input: {
    alertId: string;
    workspaceId: string;
    awsAccountId: string | null;
    observedAmount: number;
    currency: string;
    eventKey?: string | null;
  }): Promise<{ id: string }> {
    const result = await pool.query(
      `INSERT INTO alert_events (alert_id, workspace_id, aws_account_id, observed_amount, currency, event_key)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (event_key) WHERE event_key IS NOT NULL
       DO NOTHING
       RETURNING id`,
      [
        input.alertId,
        input.workspaceId,
        input.awsAccountId,
        input.observedAmount,
        input.currency,
        input.eventKey ?? null,
      ],
    );

    return { id: result.rows[0]?.id ? String(result.rows[0].id) : "" };
  },
};
