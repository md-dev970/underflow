import { pool } from "../config/db.js";

const hashLockName = (name: string): number => {
  let hash = 0;

  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0;
  }

  return hash;
};

export const jobLockRepository = {
  async withAdvisoryLock<T>(
    name: string,
    callback: () => Promise<T>,
  ): Promise<{ acquired: boolean; result?: T }> {
    const client = await pool.connect();
    const lockId = hashLockName(name);

    try {
      const lockResult = await client.query<{ acquired: boolean }>(
        "SELECT pg_try_advisory_lock($1) AS acquired",
        [lockId],
      );

      if (!lockResult.rows[0]?.acquired) {
        return { acquired: false };
      }

      try {
        const result = await callback();
        return { acquired: true, result };
      } finally {
        await client.query("SELECT pg_advisory_unlock($1)", [lockId]);
      }
    } finally {
      client.release();
    }
  },
};
