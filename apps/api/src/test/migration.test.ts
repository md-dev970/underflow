import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const ensureTestEnv = (): void => {
  process.env.NODE_ENV = "test";
  const databaseUrl =
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/underflow_test";
  process.env.TEST_DATABASE_URL = databaseUrl;
  process.env.DATABASE_URL = databaseUrl;
  process.env.CSRF_SECRET ??= "test-csrf-secret";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
};

test("runMigrations applies migrations and reruns as a no-op", async () => {
  ensureTestEnv();
  const { runMigrations } = await import("../db/migrate.js");
  await runMigrations();
  await runMigrations();

  assert.ok(true);
});

test("runMigrations fails without recording a broken migration", async () => {
  ensureTestEnv();
  const [{ runMigrations }, { pool }] = await Promise.all([
    import("../db/migrate.js"),
    import("../config/db.js"),
  ]);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "underflow-migrations-"));

  try {
    await pool.query("DELETE FROM schema_migrations WHERE version IN ('901', '902')");
    await pool.query("DROP TABLE IF EXISTS migration_test_ok");

    await fs.writeFile(
      path.join(tempDir, "901_valid.sql"),
      `
      CREATE TABLE IF NOT EXISTS migration_test_ok (id INTEGER);
      `,
      "utf8",
    );
    await fs.writeFile(
      path.join(tempDir, "902_broken.sql"),
      "THIS IS NOT VALID SQL;",
      "utf8",
    );

    await assert.rejects(() => runMigrations(tempDir));

    const migrationRows = await pool.query<{ version: string }>(
      "SELECT version FROM schema_migrations WHERE version = $1",
      ["902"],
    );

    assert.equal(migrationRows.rowCount, 0);
  } finally {
    await pool.query("DELETE FROM schema_migrations WHERE version IN ('901', '902')");
    await pool.query("DROP TABLE IF EXISTS migration_test_ok");
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
