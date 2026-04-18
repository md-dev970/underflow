import { pool } from "../config/db.js";
import type {
  AwsAccount,
  CreateAwsAccountInput,
  UpdateAwsAccountInput,
} from "../types/aws-account.types.js";

const mapAwsAccount = (row: Record<string, unknown>): AwsAccount => ({
  id: String(row.id),
  workspaceId: String(row.workspace_id),
  name: String(row.name),
  awsAccountId: String(row.aws_account_id),
  roleArn: String(row.role_arn),
  externalId: row.external_id ? String(row.external_id) : null,
  status: String(row.status),
  lastVerifiedAt: row.last_verified_at ? new Date(String(row.last_verified_at)) : null,
  lastSyncAt: row.last_sync_at ? new Date(String(row.last_sync_at)) : null,
  createdAt: new Date(String(row.created_at)),
  updatedAt: new Date(String(row.updated_at)),
});

export const awsAccountRepository = {
  async create(
    workspaceId: string,
    input: CreateAwsAccountInput & { roleArn: string },
  ): Promise<AwsAccount> {
    const result = await pool.query(
      `INSERT INTO aws_accounts (workspace_id, name, aws_account_id, role_arn, external_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, workspace_id, name, aws_account_id, role_arn, external_id, status,
                 last_verified_at, last_sync_at, created_at, updated_at`,
      [
        workspaceId,
        input.name,
        input.awsAccountId,
        input.roleArn,
        input.externalId ?? null,
      ],
    );

    return mapAwsAccount(result.rows[0] as Record<string, unknown>);
  },

  async findById(id: string): Promise<AwsAccount | null> {
    const result = await pool.query(
      `SELECT id, workspace_id, name, aws_account_id, role_arn, external_id, status,
              last_verified_at, last_sync_at, created_at, updated_at
       FROM aws_accounts
       WHERE id = $1`,
      [id],
    );

    return result.rows[0] ? mapAwsAccount(result.rows[0]) : null;
  },

  async update(
    id: string,
    input: UpdateAwsAccountInput & { roleArn: string },
    options: { resetVerification: boolean },
  ): Promise<AwsAccount> {
    const result = await pool.query(
      `UPDATE aws_accounts
       SET name = $1,
           aws_account_id = $2,
           role_arn = $3,
           external_id = $4,
           status = CASE WHEN $5 THEN 'pending' ELSE status END,
           last_verified_at = CASE WHEN $5 THEN NULL ELSE last_verified_at END,
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, workspace_id, name, aws_account_id, role_arn, external_id, status,
                 last_verified_at, last_sync_at, created_at, updated_at`,
      [
        input.name,
        input.awsAccountId,
        input.roleArn,
        input.externalId ?? null,
        options.resetVerification,
        id,
      ],
    );

    return mapAwsAccount(result.rows[0] as Record<string, unknown>);
  },

  async findManyByWorkspaceId(workspaceId: string): Promise<AwsAccount[]> {
    const result = await pool.query(
      `SELECT id, workspace_id, name, aws_account_id, role_arn, external_id, status,
              last_verified_at, last_sync_at, created_at, updated_at
       FROM aws_accounts
       WHERE workspace_id = $1
       ORDER BY created_at ASC`,
      [workspaceId],
    );

    return result.rows.map((row) => mapAwsAccount(row as Record<string, unknown>));
  },

  async updateVerificationStatus(id: string, status: string): Promise<void> {
    await pool.query(
      `UPDATE aws_accounts
       SET status = $1, last_verified_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [status, id],
    );
  },

  async updateLastSyncAt(id: string): Promise<void> {
    await pool.query(
      `UPDATE aws_accounts
       SET last_sync_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id],
    );
  },

  async findActiveForSync(): Promise<AwsAccount[]> {
    const result = await pool.query(
      `SELECT id, workspace_id, name, aws_account_id, role_arn, external_id, status,
              last_verified_at, last_sync_at, created_at, updated_at
       FROM aws_accounts
       WHERE status IN ('verified', 'active')
       ORDER BY created_at ASC`,
    );

    return result.rows.map((row) => mapAwsAccount(row as Record<string, unknown>));
  },

  async deleteById(id: string): Promise<void> {
    await pool.query(`DELETE FROM aws_accounts WHERE id = $1`, [id]);
  },

  async getDeletionImpact(id: string): Promise<{
    deletedAlertCount: number;
    deletedSyncRunCount: number;
    deletedSnapshotCount: number;
  }> {
    const result = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM budget_alerts WHERE aws_account_id = $1) AS deleted_alert_count,
         (SELECT COUNT(*) FROM cost_sync_runs WHERE aws_account_id = $1) AS deleted_sync_run_count,
         (SELECT COUNT(*) FROM cost_snapshots WHERE aws_account_id = $1) AS deleted_snapshot_count`,
      [id],
    );

    return {
      deletedAlertCount: Number(result.rows[0]?.deleted_alert_count ?? 0),
      deletedSyncRunCount: Number(result.rows[0]?.deleted_sync_run_count ?? 0),
      deletedSnapshotCount: Number(result.rows[0]?.deleted_snapshot_count ?? 0),
    };
  },
};
