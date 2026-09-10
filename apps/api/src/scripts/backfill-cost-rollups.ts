if (process.env.ALLOW_COST_ROLLUP_BACKFILL !== "true") {
  throw new Error("Refusing to backfill cost rollups without ALLOW_COST_ROLLUP_BACKFILL=true");
}

const { pool } = await import("../config/db.js");

const run = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('cost-rollup-backfill'))",
    );
    await client.query("LOCK TABLE cost_snapshots IN SHARE MODE");
    await client.query("LOCK TABLE workspace_cost_daily_rollups IN EXCLUSIVE MODE");
    await client.query("DELETE FROM workspace_cost_daily_rollups");
    const result = await client.query<{ count: string }>(
      `WITH inserted AS (
         INSERT INTO workspace_cost_daily_rollups (
           workspace_id, usage_date, service_name, total_amount, currency, updated_at
         )
         SELECT workspace_id, usage_date, service_name, SUM(amount), MAX(currency), NOW()
         FROM cost_snapshots
         GROUP BY workspace_id, usage_date, service_name
         RETURNING 1
       )
       SELECT COUNT(*)::text AS count FROM inserted`,
    );
    await client.query("ANALYZE workspace_cost_daily_rollups");
    await client.query("COMMIT");

    console.log(
      JSON.stringify({
        costRollupBackfill: true,
        rows: Number(result.rows[0]?.count ?? 0),
      }),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      message: "Cost rollup backfill failed",
      error: error instanceof Error ? error.message : "Unknown error",
    }),
  );
  process.exitCode = 1;
});
