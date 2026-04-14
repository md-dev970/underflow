import { userRepository } from "../repositories/user.repository.js";
import { userPreferencesRepository } from "../repositories/user-preferences.repository.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";
import type {
  PublicUser,
  UpdateCurrentUserInput,
  UpdatePasswordInput,
  UserNotificationPreferences,
  UserSession,
  User,
} from "../types/auth.types.js";
import { AppError } from "../utils/app-error.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const toPublicUser = (user: User): PublicUser => ({
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

const toDeviceLabel = (userAgent: string | null): string => {
  if (!userAgent) {
    return "Unknown Device";
  }

  if (userAgent.includes("iPhone")) {
    return "iPhone";
  }

  if (userAgent.includes("Android")) {
    return "Android Device";
  }

  if (userAgent.includes("Macintosh")) {
    return "Mac";
  }

  if (userAgent.includes("Windows")) {
    return "Windows PC";
  }

  if (userAgent.includes("Linux")) {
    return "Linux Device";
  }

  return "Browser Session";
};

export const userService = {
  async updateCurrentUser(
    userId: string,
    input: UpdateCurrentUserInput,
  ): Promise<PublicUser> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const updatedUser = await userRepository.updateById(userId, input);

    return toPublicUser(updatedUser);
  },

  async updatePassword(
    userId: string,
    input: UpdatePasswordInput,
  ): Promise<void> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const passwordMatches = await verifyPassword(
      input.currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new AppError("Current password is incorrect", 401);
    }

    const newPasswordHash = await hashPassword(input.newPassword);
    await userRepository.updatePasswordById(userId, newPasswordHash);
  },

  async getNotificationPreferences(
    userId: string,
  ): Promise<UserNotificationPreferences> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return userPreferencesRepository.getOrCreate(userId);
  },

  async updateNotificationPreferences(
    userId: string,
    input: Omit<
      UserNotificationPreferences,
      "createdAt" | "updatedAt"
    >,
  ): Promise<UserNotificationPreferences> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return userPreferencesRepository.update(userId, input);
  },

  async listSessions(
    userId: string,
    currentSessionId: string | null,
  ): Promise<UserSession[]> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const sessions = await refreshTokenRepository.findActiveByUserId(userId);

    return sessions.map((session) => ({
      id: session.id,
      deviceLabel: toDeviceLabel(session.userAgent),
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      revokedAt: session.revokedAt,
      isCurrent: currentSessionId === session.id,
    }));
  },

  async revokeSession(
    userId: string,
    sessionId: string,
    currentSessionId: string | null,
  ): Promise<void> {
    const sessions = await refreshTokenRepository.findActiveByUserId(userId);
    const session = sessions.find((item) => item.id === sessionId);

    if (!session) {
      throw new AppError("Session not found", 404);
    }

    if (currentSessionId === sessionId) {
      throw new AppError("Current session cannot be revoked from this action", 400);
    }

    await refreshTokenRepository.revokeById(sessionId);
  },

  async logoutOtherSessions(userId: string, currentSessionId: string | null): Promise<void> {
    if (!currentSessionId) {
      throw new AppError("Current session could not be determined", 400);
    }

    await refreshTokenRepository.revokeByUserIdExcept(userId, currentSessionId);
  },
};
