import { pool } from "../config/db.js";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  Workspace,
} from "../types/workspace.types.js";

const mapWorkspace = (row: Record<string, unknown>): Workspace => ({
  id: String(row.id),
  name: String(row.name),
  slug: String(row.slug),
  ownerUserId: String(row.owner_user_id),
  createdAt: new Date(String(row.created_at)),
  updatedAt: new Date(String(row.updated_at)),
});

export const workspaceRepository = {
  async create(userId: string, input: CreateWorkspaceInput): Promise<Workspace> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO workspaces (name, slug, owner_user_id)
         VALUES ($1, $2, $3)
         RETURNING id, name, slug, owner_user_id, created_at, updated_at`,
        [input.name, input.slug, userId],
      );

      const workspace = mapWorkspace(result.rows[0] as Record<string, unknown>);

      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [workspace.id, userId],
      );

      await client.query("COMMIT");
      return workspace;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async findById(id: string): Promise<Workspace | null> {
    const result = await pool.query(
      `SELECT id, name, slug, owner_user_id, created_at, updated_at
       FROM workspaces
       WHERE id = $1`,
      [id],
    );

    return result.rows[0] ? mapWorkspace(result.rows[0]) : null;
  },

  async findManyForUser(userId: string): Promise<Workspace[]> {
    const result = await pool.query(
      `SELECT w.id, w.name, w.slug, w.owner_user_id, w.created_at, w.updated_at
       FROM workspaces w
       INNER JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = $1
       ORDER BY w.created_at ASC`,
      [userId],
    );

    return result.rows.map((row) => mapWorkspace(row as Record<string, unknown>));
  },

  async updateById(id: string, input: UpdateWorkspaceInput): Promise<Workspace> {
    const fields: string[] = [];
    const values: string[] = [];

    if (input.name !== undefined) {
      fields.push(`name = $${values.length + 1}`);
      values.push(input.name);
    }

    if (input.slug !== undefined) {
      fields.push(`slug = $${values.length + 1}`);
      values.push(input.slug);
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE workspaces
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, name, slug, owner_user_id, created_at, updated_at`,
      values,
    );

    return mapWorkspace(result.rows[0] as Record<string, unknown>);
  },

  async userHasAccess(workspaceId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1
       FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId],
    );

    return Boolean(result.rows[0]);
  },

  async deleteById(id: string): Promise<void> {
    await pool.query(`DELETE FROM workspaces WHERE id = $1`, [id]);
  },

  async getDeletionImpact(id: string): Promise<{
    deletedAwsAccountCount: number;
    deletedAlertCount: number;
    deletedSnapshotCount: number;
    deletedSyncRunCount: number;
    deletedNotificationCount: number;
  }> {
    const result = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM aws_accounts WHERE workspace_id = $1) AS deleted_aws_account_count,
         (SELECT COUNT(*) FROM budget_alerts WHERE workspace_id = $1) AS deleted_alert_count,
         (SELECT COUNT(*) FROM cost_snapshots WHERE workspace_id = $1) AS deleted_snapshot_count,
         (SELECT COUNT(*)
            FROM cost_sync_runs csr
            INNER JOIN aws_accounts aa ON aa.id = csr.aws_account_id
           WHERE aa.workspace_id = $1) AS deleted_sync_run_count,
         (SELECT COUNT(*)
            FROM notification_deliveries nd
            INNER JOIN alert_events ae ON ae.id = nd.alert_event_id
           WHERE ae.workspace_id = $1) AS deleted_notification_count`,
      [id],
    );

    return {
      deletedAwsAccountCount: Number(result.rows[0]?.deleted_aws_account_count ?? 0),
      deletedAlertCount: Number(result.rows[0]?.deleted_alert_count ?? 0),
      deletedSnapshotCount: Number(result.rows[0]?.deleted_snapshot_count ?? 0),
      deletedSyncRunCount: Number(result.rows[0]?.deleted_sync_run_count ?? 0),
      deletedNotificationCount: Number(result.rows[0]?.deleted_notification_count ?? 0),
    };
  },
};
