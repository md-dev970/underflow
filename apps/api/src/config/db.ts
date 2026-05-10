import pg from "pg";

import { runtimeEnv } from "./runtime-env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: runtimeEnv.DATABASE_URL,
  ssl: runtimeEnv.DATABASE_SSL_ENABLED
    ? {
        rejectUnauthorized: runtimeEnv.DATABASE_SSL_REJECT_UNAUTHORIZED,
      }
    : undefined,
});

export const connectToDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  client.release();
};
