import { pool } from "../config/db.js";
import type { PasswordResetTokenRecord } from "../types/auth.types.js";

const mapPasswordResetToken = (
  row: Record<string, unknown>,
): PasswordResetTokenRecord => ({
  id: String(row.id),
  userId: String(row.user_id),
  tokenHash: String(row.token_hash),
  expiresAt: new Date(String(row.expires_at)),
  usedAt: row.used_at ? new Date(String(row.used_at)) : null,
  createdAt: new Date(String(row.created_at)),
});

export const passwordResetTokenRepository = {
  async create(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenRecord> {
    const result = await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, token_hash, expires_at, used_at, created_at`,
      [input.userId, input.tokenHash, input.expiresAt],
    );

    return mapPasswordResetToken(result.rows[0] as Record<string, unknown>);
  },

  async findActiveByTokenHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenRecord | null> {
    const result = await pool.query(
      `SELECT id, user_id, token_hash, expires_at, used_at, created_at
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [tokenHash],
    );

    return result.rows[0]
      ? mapPasswordResetToken(result.rows[0] as Record<string, unknown>)
      : null;
  },

  async markUsed(id: string): Promise<void> {
    await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE id = $1 AND used_at IS NULL`,
      [id],
    );
  },

  async markAllUsedByUserId(userId: string): Promise<void> {
    await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId],
    );
  },
};
