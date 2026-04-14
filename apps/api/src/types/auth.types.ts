export type UserRole = "admin" | "manager" | "customer";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  passwordChangedAt: Date;
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: PublicUser;
  tokens: AuthTokens;
}

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
}

export interface UpdateCurrentUserInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface SessionMetadata {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface UserNotificationPreferences {
  costAlerts: boolean;
  driftReports: boolean;
  maintenance: boolean;
  featureReleases: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  id: string;
  deviceLabel: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
  isCurrent: boolean;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  sessionVersion: number;
  type: "access";
  iat?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: "refresh";
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  sessionVersion: number;
}
