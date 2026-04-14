import { pool } from "../config/db.js";
import type {
  RegisterInput,
  UpdateCurrentUserInput,
  User,
} from "../types/auth.types.js";

const mapUser = (row: Record<string, unknown>): User => ({
  id: String(row.id),
  email: String(row.email),
  passwordHash: String(row.password_hash),
  firstName: String(row.first_name),
  lastName: String(row.last_name),
  phone: row.phone ? String(row.phone) : null,
  avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
  role: row.role as User["role"],
  isActive: Boolean(row.is_active),
  isEmailVerified: Boolean(row.is_email_verified),
  passwordChangedAt: new Date(String(row.password_changed_at)),
  sessionVersion: Number(row.session_version),
  createdAt: new Date(String(row.created_at)),
  updatedAt: new Date(String(row.updated_at)),
});

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name, phone, avatar_url,
              role, is_active, is_email_verified, password_changed_at, session_version, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email],
    );

    return result.rows[0] ? mapUser(result.rows[0]) : null;
  },

  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name, phone, avatar_url,
              role, is_active, is_email_verified, password_changed_at, session_version, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id],
    );

    return result.rows[0] ? mapUser(result.rows[0]) : null;
  },

  async create(input: RegisterInput, passwordHash: string): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (
         email,
         password_hash,
         first_name,
         last_name,
         phone,
         avatar_url
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, password_hash, first_name, last_name, phone, avatar_url,
                 role, is_active, is_email_verified, password_changed_at, session_version, created_at, updated_at`,
      [
        input.email,
        passwordHash,
        input.firstName,
        input.lastName,
        input.phone ?? null,
        input.avatarUrl ?? null,
      ],
    );

    return mapUser(result.rows[0] as Record<string, unknown>);
  },

  async updateById(id: string, input: UpdateCurrentUserInput): Promise<User> {
    const fields: string[] = [];
    const values: Array<string | null> = [];

    if (input.firstName !== undefined) {
      fields.push(`first_name = $${values.length + 1}`);
      values.push(input.firstName);
    }

    if (input.lastName !== undefined) {
      fields.push(`last_name = $${values.length + 1}`);
      values.push(input.lastName);
    }

    if (input.phone !== undefined) {
      fields.push(`phone = $${values.length + 1}`);
      values.push(input.phone);
    }

    if (input.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${values.length + 1}`);
      values.push(input.avatarUrl);
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE users
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, email, password_hash, first_name, last_name, phone, avatar_url,
                 role, is_active, is_email_verified, password_changed_at, session_version, created_at, updated_at`,
      values,
    );

    return mapUser(result.rows[0] as Record<string, unknown>);
  },

  async updatePasswordById(id: string, passwordHash: string): Promise<void> {
    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           password_changed_at = NOW(),
           session_version = session_version + 1,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, id],
    );
  },
};
