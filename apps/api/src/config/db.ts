import pg from "pg";

import { env } from "./env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const connectToDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  client.release();
};
