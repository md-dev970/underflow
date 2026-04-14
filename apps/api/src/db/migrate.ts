import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pool } from "../config/db.js";
import { logger } from "../lib/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDirectory = path.join(__dirname, "migrations");

type MigrationFile = {
  version: string;
  name: string;
  filename: string;
  fullPath: string;
};

const ensureMigrationsTable = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
};

const listMigrationFiles = async (directory: string): Promise<MigrationFile[]> => {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => {
      const [version, ...nameParts] = entry.name.replace(/\.sql$/, "").split("_");

      if (!version) {
        throw new Error(`Invalid migration filename: ${entry.name}`);
      }

      return {
        version,
        name: nameParts.join("_") || version,
        filename: entry.name,
        fullPath: path.join(directory, entry.name),
      };
    })
    .sort((left, right) => left.version.localeCompare(right.version));
};

export const runMigrations = async (directory = migrationsDirectory): Promise<void> => {
  await ensureMigrationsTable();
  const files = await listMigrationFiles(directory);
  const appliedResult = await pool.query<{ version: string }>(
    "SELECT version FROM schema_migrations",
  );
  const applied = new Set(appliedResult.rows.map((row) => row.version));

  for (const migration of files) {
    if (applied.has(migration.version)) {
      continue;
    }

    const sql = await fs.readFile(migration.fullPath, "utf8");
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (version, name) VALUES ($1, $2)",
        [migration.version, migration.name],
      );
      await client.query("COMMIT");
      logger.info("Migration applied", {
        migrationVersion: migration.version,
        migrationName: migration.name,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Migration failed", {
        migrationVersion: migration.version,
        migrationName: migration.name,
        errorMessage: error instanceof Error ? error.message : "Unknown migration error",
      });
      throw error;
    } finally {
      client.release();
    }
  }
};

const runCli = async (): Promise<void> => {
  await runMigrations();
  await pool.end();
};

if (process.argv[1] === __filename) {
  runCli().catch((error: unknown) => {
    logger.error("Migration runner failed", {
      errorMessage: error instanceof Error ? error.message : "Unknown migration error",
    });
    void pool.end().finally(() => {
      process.exit(1);
    });
  });
}
