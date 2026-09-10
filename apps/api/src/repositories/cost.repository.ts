import type { PoolClient } from "pg";

import { pool } from "../config/db.js";
import type {
  CostQueryInput,
  CostSummary,
  ServiceCostBreakdownItem,
  SyncHistoryItem,
  SyncHistoryQueryInput,
  TimeseriesCostPoint,
} from "../types/aws-account.types.js";

const rebuildWorkspaceRollups = async (
  client: PoolClient,
  workspaceId: string,
  from: string,
  to: string,
): Promise<void> => {
  await client.query(
    `DELETE FROM workspace_cost_daily_rollups
     WHERE workspace_id = $1
       AND usage_date BETWEEN $2 AND $3`,
    [workspaceId, from, to],
  );
  await client.query(
    `INSERT INTO workspace_cost_daily_rollups (
       workspace_id, usage_date, service_name, total_amount, currency, updated_at
     )
     SELECT workspace_id, usage_date, service_name, SUM(amount), MAX(currency), NOW()
     FROM cost_snapshots
     WHERE workspace_id = $1
       AND usage_date BETWEEN $2 AND $3
     GROUP BY workspace_id, usage_date, service_name`,
    [workspaceId, from, to],
  );
};

export const costRepository = {
  async createSyncRun(awsAccountId: string): Promise<string> {
    const result = await pool.query(
      `INSERT INTO cost_sync_runs (aws_account_id, status)
       VALUES ($1, 'running')
       RETURNING id`,
      [awsAccountId],
    );

    return String(result.rows[0]?.id);
  },

  async hasRunningSyncRun(awsAccountId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1
       FROM cost_sync_runs
       WHERE aws_account_id = $1
         AND status = 'running'
       LIMIT 1`,
      [awsAccountId],
    );

    return (result.rowCount ?? 0) > 0;
  },

  async completeSyncRun(syncRunId: string, status: string, errorMessage?: string): Promise<void> {
    await pool.query(
      `UPDATE cost_sync_runs
       SET status = $1, finished_at = NOW(), error_message = $2
       WHERE id = $3`,
      [status, errorMessage ?? null, syncRunId],
    );
  },

  async replaceSnapshots(input: {
    workspaceId: string;
    awsAccountId: string;
    from: string;
    to: string;
    entries: Array<{
      usageDate: string;
      serviceName: string;
      amount: number;
      currency: string;
    }>;
  }): Promise<number> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      // Account syncs are independently locked, so serialize mutations and
      // rollup refreshes for the same workspace.
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext('cost-rollup:' || $1::text))",
        [input.workspaceId],
      );
      await client.query(
        `DELETE FROM cost_snapshots
         WHERE workspace_id = $1
           AND aws_account_id = $2
           AND usage_date BETWEEN $3 AND $4`,
        [input.workspaceId, input.awsAccountId, input.from, input.to],
      );

      for (const entry of input.entries) {
        await client.query(
          `INSERT INTO cost_snapshots (workspace_id, aws_account_id, usage_date, service_name, amount, currency)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (workspace_id, aws_account_id, usage_date, service_name)
           DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency`,
          [
            input.workspaceId,
            input.awsAccountId,
            entry.usageDate,
            entry.serviceName,
            entry.amount,
            entry.currency,
          ],
        );
      }

      await rebuildWorkspaceRollups(client, input.workspaceId, input.from, input.to);
      await client.query("COMMIT");
      return input.entries.length;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async getSummary(workspaceId: string, input: CostQueryInput): Promise<CostSummary> {
    const result = input.awsAccountId
      ? await pool.query(
          `SELECT COALESCE(SUM(amount), 0) AS total_amount, COALESCE(MAX(currency), 'USD') AS currency
           FROM cost_snapshots
           WHERE workspace_id = $1
             AND usage_date BETWEEN $2 AND $3
             AND aws_account_id = $4::uuid`,
          [workspaceId, input.from, input.to, input.awsAccountId],
        )
      : await pool.query(
          `SELECT COALESCE(SUM(total_amount), 0) AS total_amount, COALESCE(MAX(currency), 'USD') AS currency
           FROM workspace_cost_daily_rollups
           WHERE workspace_id = $1
             AND usage_date BETWEEN $2 AND $3`,
          [workspaceId, input.from, input.to],
        );

    return {
      totalAmount: Number(result.rows[0]?.total_amount ?? 0),
      currency: String(result.rows[0]?.currency ?? "USD"),
      from: input.from,
      to: input.to,
    };
  },

  async getByService(
    workspaceId: string,
    input: CostQueryInput,
  ): Promise<ServiceCostBreakdownItem[]> {
    const result = input.awsAccountId
      ? await pool.query(
          `SELECT service_name, SUM(amount) AS total_amount, COALESCE(MAX(currency), 'USD') AS currency
           FROM cost_snapshots
           WHERE workspace_id = $1
             AND usage_date BETWEEN $2 AND $3
             AND aws_account_id = $4::uuid
           GROUP BY service_name
           ORDER BY total_amount DESC`,
          [workspaceId, input.from, input.to, input.awsAccountId],
        )
      : await pool.query(
          `SELECT service_name, SUM(total_amount) AS total_amount, COALESCE(MAX(currency), 'USD') AS currency
           FROM workspace_cost_daily_rollups
           WHERE workspace_id = $1
             AND usage_date BETWEEN $2 AND $3
           GROUP BY service_name
           ORDER BY total_amount DESC`,
          [workspaceId, input.from, input.to],
        );

    return result.rows.map((row) => ({
      serviceName: String(row.service_name),
      amount: Number(row.total_amount),
      currency: String(row.currency),
    }));
  },

  async getTimeseries(
    workspaceId: string,
    input: CostQueryInput,
  ): Promise<TimeseriesCostPoint[]> {
    const result = input.awsAccountId
      ? await pool.query(
          `SELECT usage_date, SUM(amount) AS total_amount, COALESCE(MAX(currency), 'USD') AS currency
           FROM cost_snapshots
           WHERE workspace_id = $1
             AND usage_date BETWEEN $2 AND $3
             AND aws_account_id = $4::uuid
           GROUP BY usage_date
           ORDER BY usage_date ASC`,
          [workspaceId, input.from, input.to, input.awsAccountId],
        )
      : await pool.query(
          `SELECT usage_date, SUM(total_amount) AS total_amount, COALESCE(MAX(currency), 'USD') AS currency
           FROM workspace_cost_daily_rollups
           WHERE workspace_id = $1
             AND usage_date BETWEEN $2 AND $3
           GROUP BY usage_date
           ORDER BY usage_date ASC`,
          [workspaceId, input.from, input.to],
        );

    return result.rows.map((row) => ({
      usageDate: String(row.usage_date).slice(0, 10),
      amount: Number(row.total_amount),
      currency: String(row.currency),
    }));
  },

  async getSyncHistory(
    workspaceId: string,
    input: SyncHistoryQueryInput,
  ): Promise<SyncHistoryItem[]> {
    const result = await pool.query(
      `SELECT
         csr.id,
         csr.aws_account_id,
         aa.name AS aws_account_name,
         aa.aws_account_id AS account_number,
         csr.status,
         csr.started_at,
         csr.finished_at,
         csr.error_message
       FROM cost_sync_runs csr
       INNER JOIN aws_accounts aa ON aa.id = csr.aws_account_id
       WHERE aa.workspace_id = $1
         AND ($2::uuid IS NULL OR csr.aws_account_id = $2::uuid)
         AND ($3::text IS NULL OR csr.status = $3::text)
       ORDER BY csr.started_at DESC
       LIMIT $4`,
      [
        workspaceId,
        input.awsAccountId ?? null,
        input.status ?? null,
        input.limit ?? 25,
      ],
    );

    return result.rows.map((row) => ({
      id: String(row.id),
      awsAccountId: String(row.aws_account_id),
      awsAccountName: String(row.aws_account_name),
      accountNumber: String(row.account_number),
      status: String(row.status),
      startedAt: new Date(String(row.started_at)),
      finishedAt: row.finished_at ? new Date(String(row.finished_at)) : null,
      errorMessage: row.error_message ? String(row.error_message) : null,
    }));
  },
};
