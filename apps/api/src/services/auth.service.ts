import { randomUUID } from "node:crypto";

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { AppError } from "../utils/app-error.js";
import { generateOpaqueToken, hashToken } from "../utils/crypto.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { passwordResetTokenRepository } from "../repositories/password-reset-token.repository.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { authEmailService } from "./auth-email.service.js";
import type {
  AuthResult,
  AuthenticatedUser,
  LoginInput,
  PublicUser,
  SessionMetadata,
  RegisterInput,
  User,
} from "../types/auth.types.js";

const publicUserFromUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  avatarUrl: user.avatarUrl,
  role: user.role,
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  sessionVersion: user.sessionVersion,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const buildAuthenticatedUser = (user: PublicUser): AuthenticatedUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  sessionVersion: user.sessionVersion,
});

const parseRefreshTokenExpiry = (): Date => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
};

const parsePasswordResetExpiry = (): Date => {
  const expiresAt = new Date();
  expiresAt.setMinutes(
    expiresAt.getMinutes() + env.PASSWORD_RESET_EXPIRES_IN_MINUTES,
  );
  return expiresAt;
};

export const getSessionIdFromRefreshToken = (token: string): string => {
  const [sessionId] = token.split(".");

  if (!sessionId) {
    throw new AppError("Invalid refresh token", 401);
  }

  return sessionId;
};

const issueTokens = async (
  user: PublicUser,
  metadata?: SessionMetadata,
  sessionId = randomUUID(),
): Promise<AuthResult> => {
  const rawRefreshToken = generateOpaqueToken();
  const refreshToken = signRefreshToken({
    sub: user.id,
    sessionId,
    type: "refresh",
  });
  const combinedRefreshToken = `${sessionId}.${rawRefreshToken}.${refreshToken}`;

  await refreshTokenRepository.create({
    id: sessionId,
    userId: user.id,
    tokenHash: hashToken(combinedRefreshToken),
    userAgent: metadata?.userAgent ?? null,
    ipAddress: metadata?.ipAddress ?? null,
    expiresAt: parseRefreshTokenExpiry(),
  });

  return {
    user,
    tokens: {
      accessToken: signAccessToken(buildAuthenticatedUser(user)),
      refreshToken: combinedRefreshToken,
    },
  };
};

const parseStoredRefreshToken = (token: string): { sessionId: string; jwtToken: string } => {
  const parts = token.split(".");

  if (parts.length < 3) {
    throw new AppError("Invalid refresh token", 401);
  }

  const [sessionId, , ...jwtParts] = parts;
  const jwtToken = jwtParts.join(".");

  if (!sessionId || !jwtToken) {
    throw new AppError("Invalid refresh token", 401);
  }

  return { sessionId, jwtToken };
};

export const authService = {
  async register(
    input: RegisterInput,
    metadata?: SessionMetadata,
  ): Promise<AuthResult> {
    const existingUser = await userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new AppError("Email is already registered", 409);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create(input, passwordHash);

    return issueTokens(publicUserFromUser(user), metadata);
  },

  async login(input: LoginInput, metadata?: SessionMetadata): Promise<AuthResult> {
    const user = await userRepository.findByEmail(input.email);

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const passwordMatches = await verifyPassword(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("Invalid email or password", 401);
    }

    if (!user.isActive) {
      throw new AppError("User account is inactive", 403);
    }

    return issueTokens(publicUserFromUser(user), metadata);
  },

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return publicUserFromUser(user);
  },

  async refreshAccessToken(
    token: string,
    metadata?: SessionMetadata,
  ): Promise<AuthResult> {
    const { sessionId, jwtToken } = parseStoredRefreshToken(token);
    const payload = verifyRefreshToken(jwtToken);

    if (payload.sessionId !== sessionId) {
      throw new AppError("Refresh token is invalid", 401);
    }

    const refreshTokenRecord = await refreshTokenRepository.findActiveById(sessionId);

    if (!refreshTokenRecord) {
      throw new AppError("Refresh token is invalid or revoked", 401);
    }

    if (refreshTokenRecord.expiresAt.getTime() <= Date.now()) {
      await refreshTokenRepository.revokeById(refreshTokenRecord.id);
      throw new AppError("Refresh token has expired", 401);
    }

    if (refreshTokenRecord.tokenHash !== hashToken(token)) {
      throw new AppError("Refresh token is invalid", 401);
    }

    const user = await userRepository.findById(refreshTokenRecord.userId);

    if (!user || !user.isActive) {
      throw new AppError("User is not available", 401);
    }

    const rawRefreshToken = generateOpaqueToken();
    const refreshToken = signRefreshToken({
      sub: user.id,
      sessionId: refreshTokenRecord.id,
      type: "refresh",
    });
    const combinedRefreshToken = `${refreshTokenRecord.id}.${rawRefreshToken}.${refreshToken}`;

    await refreshTokenRepository.rotateById(refreshTokenRecord.id, {
      tokenHash: hashToken(combinedRefreshToken),
      userAgent: metadata?.userAgent ?? refreshTokenRecord.userAgent,
      ipAddress: metadata?.ipAddress ?? refreshTokenRecord.ipAddress,
      expiresAt: parseRefreshTokenExpiry(),
    });

    return {
      user: publicUserFromUser(user),
      tokens: {
        accessToken: signAccessToken(buildAuthenticatedUser(publicUserFromUser(user))),
        refreshToken: combinedRefreshToken,
      },
    };
  },

  async logout(token: string): Promise<void> {
    const { sessionId, jwtToken } = parseStoredRefreshToken(token);
    const payload = verifyRefreshToken(jwtToken);

    if (payload.sessionId !== sessionId) {
      throw new AppError("Refresh token is invalid", 401);
    }

    await refreshTokenRepository.revokeById(sessionId);
  },

  async requestPasswordReset(email: string): Promise<void> {
    logger.info("Password reset requested", { email });
    const user = await userRepository.findByEmail(email);

    if (!user) {
      logger.info("Password reset request completed without matching user", { email });
      return;
    }

    await passwordResetTokenRepository.markAllUsedByUserId(user.id);

    const token = generateOpaqueToken();
    await passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: parsePasswordResetExpiry(),
    });

    try {
      await authEmailService.sendPasswordResetEmail({
        email: user.email,
        firstName: user.firstName,
        token,
      });
      logger.info("Password reset email queued", {
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      logger.error("Password reset email delivery failed", {
        userId: user.id,
        email: user.email,
        errorMessage: error instanceof Error ? error.message : "Unknown email error",
      });
    }
  },

  async resetPassword(token: string, password: string): Promise<void> {
    const passwordResetToken = await passwordResetTokenRepository.findActiveByTokenHash(
      hashToken(token),
    );

    if (!passwordResetToken) {
      throw new AppError("Reset token is invalid or expired", 400);
    }

    if (passwordResetToken.expiresAt.getTime() <= Date.now()) {
      await passwordResetTokenRepository.markUsed(passwordResetToken.id);
      throw new AppError("Reset token is invalid or expired", 400);
    }

    const user = await userRepository.findById(passwordResetToken.userId);

    if (!user) {
      await passwordResetTokenRepository.markUsed(passwordResetToken.id);
      throw new AppError("Reset token is invalid or expired", 400);
    }

    const passwordHash = await hashPassword(password);
    await userRepository.updatePasswordById(user.id, passwordHash);
    await passwordResetTokenRepository.markAllUsedByUserId(user.id);
    await refreshTokenRepository.revokeByUserId(user.id);
    logger.info("Password reset completed", {
      userId: user.id,
      email: user.email,
    });
  },
};
