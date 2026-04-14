import { pool } from "../config/db.js";
import type { NotificationFeedItem } from "../types/notification.types.js";

const mapNotificationFeedItem = (
  row: Record<string, unknown>,
): NotificationFeedItem => ({
  id: String(row.id),
  alertEventId: String(row.alert_event_id),
  channel: String(row.channel),
  recipient: String(row.recipient),
  status: String(row.status),
  sentAt: row.sent_at ? new Date(String(row.sent_at)) : null,
  errorMessage: row.error_message ? String(row.error_message) : null,
  createdAt: new Date(String(row.created_at)),
  workspaceId: String(row.workspace_id),
  workspaceName: String(row.workspace_name),
  alertId: String(row.alert_id),
  alertName: String(row.alert_name),
  awsAccountId: row.aws_account_id ? String(row.aws_account_id) : null,
  awsAccountName: row.aws_account_name ? String(row.aws_account_name) : null,
  triggeredAt: new Date(String(row.triggered_at)),
});

export const notificationRepository = {
  async create(input: {
    alertEventId: string;
    recipient: string;
    status: string;
    errorMessage?: string;
    sentAt?: Date | null;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO notification_deliveries (alert_event_id, recipient, status, error_message, sent_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        input.alertEventId,
        input.recipient,
        input.status,
        input.errorMessage ?? null,
        input.sentAt ?? null,
      ],
    );
  },

  async findFeedForUser(input: {
    userId: string;
    workspaceId?: string | undefined;
    status?: string | undefined;
    limit?: number | undefined;
  }): Promise<NotificationFeedItem[]> {
    const result = await pool.query(
      `SELECT
         nd.id,
         nd.alert_event_id,
         nd.channel,
         nd.recipient,
         nd.status,
         nd.sent_at,
         nd.error_message,
         nd.created_at,
         ae.workspace_id,
         w.name AS workspace_name,
         ba.id AS alert_id,
         ba.name AS alert_name,
         ae.aws_account_id,
         aa.name AS aws_account_name,
         ae.triggered_at
       FROM notification_deliveries nd
       INNER JOIN alert_events ae ON ae.id = nd.alert_event_id
       INNER JOIN budget_alerts ba ON ba.id = ae.alert_id
       INNER JOIN workspaces w ON w.id = ae.workspace_id
       INNER JOIN workspace_members wm ON wm.workspace_id = w.id
       LEFT JOIN aws_accounts aa ON aa.id = ae.aws_account_id
       WHERE wm.user_id = $1
         AND ($2::uuid IS NULL OR ae.workspace_id = $2::uuid)
         AND ($3::text IS NULL OR nd.status = $3::text)
       ORDER BY COALESCE(nd.sent_at, nd.created_at) DESC, nd.created_at DESC
       LIMIT $4`,
      [
        input.userId,
        input.workspaceId ?? null,
        input.status ?? null,
        input.limit ?? 25,
      ],
    );

    return result.rows.map((row) =>
      mapNotificationFeedItem(row as Record<string, unknown>),
    );
  },
};
