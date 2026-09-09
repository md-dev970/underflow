const BENCHMARK_GUARD = "ALLOW_BENCHMARK_SEED";
const EXPECTED_COST_SNAPSHOTS = 3_650_000;

const assertBenchmarkGuard = (): void => {
  if (process.env[BENCHMARK_GUARD] !== "true") {
    const environment = process.env.NODE_ENV ?? "development";
    throw new Error(
      `Refusing to seed benchmark data in ${environment}: set ${BENCHMARK_GUARD}=true explicitly`,
    );
  }
};

assertBenchmarkGuard();

const benchmarkPassword = process.env.BENCHMARK_PASSWORD;

if (!benchmarkPassword || benchmarkPassword.length < 12) {
  throw new Error("BENCHMARK_PASSWORD must contain at least 12 characters");
}

const { pool } = await import("../config/db.js");
const { hashPassword } = await import("../utils/password.js");

const benchmarkUuid = (kind: number, sequence: number): string =>
  `${kind}0000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;

const userIds = Array.from({ length: 10 }, (_, index) => benchmarkUuid(1, index + 1));
const workspaceIds = Array.from(
  { length: 10 },
  (_, index) => benchmarkUuid(2, index + 1),
);

const run = async (): Promise<void> => {
  const passwordHash = await hashPassword(benchmarkPassword);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // The fixed UUID ranges and reserved example.invalid identities are the complete
    // ownership boundary for this disposable dataset.
    await client.query("DELETE FROM workspaces WHERE id = ANY($1::uuid[])", [workspaceIds]);
    await client.query(
      `DELETE FROM users
       WHERE id = ANY($1::uuid[])
          OR email = ANY(
            SELECT format('benchmark+%s@example.invalid', lpad(i::text, 2, '0'))
            FROM generate_series(1, 10) AS i
          )`,
      [userIds],
    );

    await client.query(
      `INSERT INTO users (
         id, email, password_hash, first_name, last_name, role,
         is_active, is_email_verified, password_changed_at, session_version
       )
       SELECT
         format('10000000-0000-4000-8000-%s', lpad(i::text, 12, '0'))::uuid,
         format('benchmark+%s@example.invalid', lpad(i::text, 2, '0')),
         $1,
         'Benchmark',
         format('User %s', lpad(i::text, 2, '0')),
         'customer', TRUE, TRUE, TIMESTAMP '2025-01-01 00:00:00', 1
       FROM generate_series(1, 10) AS i`,
      [passwordHash],
    );

    await client.query(
      `INSERT INTO workspaces (id, name, slug, owner_user_id, created_at, updated_at)
       SELECT
         format('20000000-0000-4000-8000-%s', lpad(i::text, 12, '0'))::uuid,
         format('Benchmark Workspace %s', lpad(i::text, 2, '0')),
         format('benchmark-workspace-%s', lpad(i::text, 2, '0')),
         format('10000000-0000-4000-8000-%s', lpad(i::text, 12, '0'))::uuid,
         TIMESTAMP '2025-01-01 00:00:00', TIMESTAMP '2025-01-01 00:00:00'
       FROM generate_series(1, 10) AS i`,
    );

    await client.query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
       SELECT
         format('21000000-0000-4000-8000-%s', lpad(i::text, 12, '0'))::uuid,
         format('20000000-0000-4000-8000-%s', lpad(i::text, 12, '0'))::uuid,
         format('10000000-0000-4000-8000-%s', lpad(i::text, 12, '0'))::uuid,
         'owner', TIMESTAMP '2025-01-01 00:00:00'
       FROM generate_series(1, 10) AS i`,
    );

    await client.query(
      `INSERT INTO aws_accounts (
         id, workspace_id, name, aws_account_id, role_arn, external_id,
         status, last_verified_at, last_sync_at, created_at, updated_at
       )
       SELECT
         format(
           '30000000-0000-4000-8000-%s',
           lpad((((workspace_number - 1) * 20) + account_number)::text, 12, '0')
         )::uuid,
         format(
           '20000000-0000-4000-8000-%s',
           lpad(workspace_number::text, 12, '0')
         )::uuid,
         format('Synthetic Account %s-%s', workspace_number, lpad(account_number::text, 2, '0')),
         lpad((workspace_number * 1000 + account_number)::text, 12, '0'),
         format(
           'arn:aws:iam::%s:role/UnderflowSyntheticBenchmark',
           lpad((workspace_number * 1000 + account_number)::text, 12, '0')
         ),
         format('benchmark-external-%s-%s', workspace_number, account_number),
         'verified', TIMESTAMP '2025-01-01 00:00:00',
         TIMESTAMP '2025-12-31 23:59:00', TIMESTAMP '2025-01-01 00:00:00',
         TIMESTAMP '2025-12-31 23:59:00'
       FROM generate_series(1, 10) AS workspace_number
       CROSS JOIN generate_series(1, 20) AS account_number`,
    );

    await client.query(
      `INSERT INTO cost_sync_runs (
         id, aws_account_id, status, started_at, finished_at, error_message
       )
       SELECT
         format('40000000-0000-4000-8000-%s', lpad(sequence_number::text, 12, '0'))::uuid,
         format('30000000-0000-4000-8000-%s', lpad(sequence_number::text, 12, '0'))::uuid,
         'completed', TIMESTAMP '2025-12-31 23:55:00',
         TIMESTAMP '2025-12-31 23:59:00', NULL
       FROM generate_series(1, 200) AS sequence_number`,
    );

    await client.query(
      `INSERT INTO cost_snapshots (
         workspace_id, aws_account_id, usage_date, service_name, amount, currency, created_at
       )
       SELECT
         format(
           '20000000-0000-4000-8000-%s',
           lpad(workspace_number::text, 12, '0')
         )::uuid,
         format(
           '30000000-0000-4000-8000-%s',
           lpad((((workspace_number - 1) * 20) + account_number)::text, 12, '0')
         )::uuid,
         DATE '2025-01-01' + day_offset,
         format('Synthetic Service %s', lpad(service_number::text, 2, '0')),
         (
           ((workspace_number * 100000 + account_number * 1000 + day_offset * 10 + service_number)
             % 500000) + 1
         )::numeric / 100,
         'USD', TIMESTAMP '2025-01-01 00:00:00'
       FROM generate_series(1, 10) AS workspace_number
       CROSS JOIN generate_series(1, 20) AS account_number
       CROSS JOIN generate_series(0, 364) AS day_offset
       CROSS JOIN generate_series(1, 50) AS service_number`,
    );

    const countsResult = await client.query<{
      users: string;
      workspaces: string;
      workspace_members: string;
      aws_accounts: string;
      cost_sync_runs: string;
      cost_snapshots: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE id = ANY($1::uuid[])) AS users,
         (SELECT COUNT(*) FROM workspaces WHERE id = ANY($2::uuid[])) AS workspaces,
         (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ANY($2::uuid[])) AS workspace_members,
         (SELECT COUNT(*) FROM aws_accounts WHERE workspace_id = ANY($2::uuid[])) AS aws_accounts,
         (SELECT COUNT(*) FROM cost_sync_runs csr
            JOIN aws_accounts aa ON aa.id = csr.aws_account_id
           WHERE aa.workspace_id = ANY($2::uuid[])) AS cost_sync_runs,
         (SELECT COUNT(*) FROM cost_snapshots WHERE workspace_id = ANY($2::uuid[])) AS cost_snapshots`,
      [userIds, workspaceIds],
    );

    const row = countsResult.rows[0];
    const counts = {
      users: Number(row?.users ?? 0),
      workspaces: Number(row?.workspaces ?? 0),
      workspaceMembers: Number(row?.workspace_members ?? 0),
      awsAccounts: Number(row?.aws_accounts ?? 0),
      costSyncRuns: Number(row?.cost_sync_runs ?? 0),
      costSnapshots: Number(row?.cost_snapshots ?? 0),
    };

    if (
      counts.users !== 10 ||
      counts.workspaces !== 10 ||
      counts.workspaceMembers !== 10 ||
      counts.awsAccounts !== 200 ||
      counts.costSyncRuns !== 200 ||
      counts.costSnapshots !== EXPECTED_COST_SNAPSHOTS
    ) {
      throw new Error(`Unexpected benchmark row counts: ${JSON.stringify(counts)}`);
    }

    await client.query(
      "ANALYZE users, workspaces, workspace_members, aws_accounts, cost_sync_runs, cost_snapshots",
    );
    await client.query("COMMIT");

    console.log(
      JSON.stringify({
        dataset: "underflow-api-benchmark-v1",
        dateRange: { from: "2025-01-01", to: "2025-12-31" },
        servicesPerAccountPerDay: 50,
        ...counts,
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
      message: "Benchmark seed failed",
      error: error instanceof Error ? error.message : "Unknown error",
    }),
  );
  process.exitCode = 1;
});
