import { pool } from "../config/db.js";
import type { RefreshTokenRecord } from "../types/auth.types.js";

const mapRefreshToken = (row: Record<string, unknown>): RefreshTokenRecord => ({
  id: String(row.id),
  userId: String(row.user_id),
  tokenHash: String(row.token_hash),
  userAgent: row.user_agent ? String(row.user_agent) : null,
  ipAddress: row.ip_address ? String(row.ip_address) : null,
  lastUsedAt: new Date(String(row.last_used_at)),
  expiresAt: new Date(String(row.expires_at)),
  revokedAt: row.revoked_at ? new Date(String(row.revoked_at)) : null,
  createdAt: new Date(String(row.created_at)),
});

export const refreshTokenRepository = {
  async create(input: {
    id: string;
    userId: string;
    tokenHash: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord> {
    const result = await pool.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, user_agent, ip_address, last_used_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id, user_id, token_hash, user_agent, ip_address, last_used_at, expires_at, revoked_at, created_at`,
      [
        input.id,
        input.userId,
        input.tokenHash,
        input.userAgent ?? null,
        input.ipAddress ?? null,
        input.expiresAt,
      ],
    );

    return mapRefreshToken(result.rows[0] as Record<string, unknown>);
  },

  async findActiveById(id: string): Promise<RefreshTokenRecord | null> {
    const result = await pool.query(
      `SELECT id, user_id, token_hash, user_agent, ip_address, last_used_at, expires_at, revoked_at, created_at
       FROM refresh_tokens
       WHERE id = $1
         AND revoked_at IS NULL`,
      [id],
    );

    return result.rows[0] ? mapRefreshToken(result.rows[0]) : null;
  },

  async revokeById(id: string): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE id = $1 AND revoked_at IS NULL`,
      [id],
    );
  },

  async rotateById(
    id: string,
    input: {
      tokenHash: string;
      userAgent?: string | null;
      ipAddress?: string | null;
      expiresAt: Date;
    },
  ): Promise<RefreshTokenRecord> {
    const result = await pool.query(
      `UPDATE refresh_tokens
       SET token_hash = $1,
           user_agent = $2,
           ip_address = $3,
           last_used_at = NOW(),
           expires_at = $4
       WHERE id = $5 AND revoked_at IS NULL
       RETURNING id, user_id, token_hash, user_agent, ip_address, last_used_at, expires_at, revoked_at, created_at`,
      [
        input.tokenHash,
        input.userAgent ?? null,
        input.ipAddress ?? null,
        input.expiresAt,
        id,
      ],
    );

    return mapRefreshToken(result.rows[0] as Record<string, unknown>);
  },

  async findActiveByUserId(userId: string): Promise<RefreshTokenRecord[]> {
    const result = await pool.query(
      `SELECT id, user_id, token_hash, user_agent, ip_address, last_used_at, expires_at, revoked_at, created_at
       FROM refresh_tokens
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND expires_at > NOW()
       ORDER BY last_used_at DESC, created_at DESC`,
      [userId],
    );

    return result.rows.map((row) => mapRefreshToken(row as Record<string, unknown>));
  },

  async revokeByUserIdExcept(userId: string, keepId: string): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE user_id = $1
         AND id <> $2
         AND revoked_at IS NULL`,
      [userId, keepId],
    );
  },

  async revokeByUserId(userId: string): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE user_id = $1
         AND revoked_at IS NULL`,
      [userId],
    );
  },
};
