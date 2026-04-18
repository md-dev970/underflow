import assert from "node:assert/strict";
import test from "node:test";

import type { PasswordResetTokenRecord } from "../types/auth.types.js";

const ensureTestEnv = (): void => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/underflow_test";
  process.env.CSRF_SECRET ??= "test-csrf-secret";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
  process.env.CLIENT_URL ??= "http://localhost:5174";
};

test("requestPasswordReset swallows email delivery failures and still completes", async () => {
  ensureTestEnv();

  const [
    { authService },
    { userRepository },
    { passwordResetTokenRepository },
    { authEmailService },
  ] = await Promise.all([
    import("../services/auth.service.js"),
    import("../repositories/user.repository.js"),
    import("../repositories/password-reset-token.repository.js"),
    import("../services/auth-email.service.js"),
  ]);

  const originalFindByEmail = userRepository.findByEmail;
  const originalMarkAllUsedByUserId = passwordResetTokenRepository.markAllUsedByUserId;
  const originalCreate = passwordResetTokenRepository.create;
  const originalSendPasswordResetEmail = authEmailService.sendPasswordResetEmail;
  let createdTokenForUserId: string | null = null;

  userRepository.findByEmail = async () => ({
    id: "user-123",
    email: "user@example.com",
    passwordHash: "password-hash",
    firstName: "Morgan",
    lastName: "Lee",
    phone: null,
    avatarUrl: null,
    role: "customer",
    isActive: true,
    isEmailVerified: false,
    passwordChangedAt: new Date("2026-01-01T00:00:00.000Z"),
    sessionVersion: 1,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  passwordResetTokenRepository.markAllUsedByUserId = async () => {};
  passwordResetTokenRepository.create = async (
    input,
  ): Promise<PasswordResetTokenRecord> => {
    createdTokenForUserId = input.userId;
    return {
      id: "reset-1",
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      usedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };
  };
  authEmailService.sendPasswordResetEmail = async () => {
    throw new Error("SES unavailable");
  };

  try {
    await authService.requestPasswordReset("user@example.com");
    assert.equal(createdTokenForUserId, "user-123");
  } finally {
    userRepository.findByEmail = originalFindByEmail;
    passwordResetTokenRepository.markAllUsedByUserId = originalMarkAllUsedByUserId;
    passwordResetTokenRepository.create = originalCreate;
    authEmailService.sendPasswordResetEmail = originalSendPasswordResetEmail;
  }
});
