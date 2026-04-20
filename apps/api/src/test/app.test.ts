import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";

import request from "supertest";

import type {
  AuthResult,
  PublicUser,
  User,
} from "../types/auth.types.js";
import type { NotificationFeedItem } from "../types/notification.types.js";
import type { SyncHistoryItem } from "../types/aws-account.types.js";

const ensureTestEnv = (): void => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL ??=
    "postgresql://postgres:postgres@localhost:5432/underflow_test";
  process.env.CSRF_SECRET ??= "test-csrf-secret";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
  process.env.JWT_ACCESS_EXPIRES_IN ??= "15m";
  process.env.JWT_REFRESH_EXPIRES_IN ??= "7d";
  process.env.CLIENT_URL ??= "http://localhost:5173";
  process.env.AUTH_COOKIE_SAME_SITE ??= "lax";
  process.env.STRIPE_PRICE_STARTER ??= "price_starter";
  process.env.STRIPE_PRICE_PRO ??= "price_pro";
  process.env.STRIPE_PRICE_BUSINESS ??= "price_business";
  process.env.BILLING_ENABLED = "true";
};

const buildUser = (): PublicUser => ({
  id: "user-123",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  phone: null,
  avatarUrl: null,
  role: "customer",
  isActive: true,
  isEmailVerified: false,
  sessionVersion: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});

const buildAuthResult = (): AuthResult => ({
  user: buildUser(),
  tokens: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
  },
});

const buildStoredUser = (): User => ({
  ...buildUser(),
  passwordHash: "password-hash",
  passwordChangedAt: new Date("2025-01-01T00:00:00.000Z"),
  sessionVersion: 1,
});

const buildAuthenticatedClaims = (user: PublicUser) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  sessionVersion: user.sessionVersion,
});

const getSetCookieHeaders = (headers: Record<string, unknown>): string[] => {
  const setCookieHeader = headers["set-cookie"];

  if (Array.isArray(setCookieHeader)) {
    return setCookieHeader.filter((value): value is string => typeof value === "string");
  }

  if (typeof setCookieHeader === "string") {
    return [setCookieHeader];
  }

  return [];
};

const loadModules = async () => {
  ensureTestEnv();

  const authServiceModule = await import("../services/auth.service.js");
  const authEmailServiceModule = await import("../services/auth-email.service.js");
  const refreshTokenRepositoryModule = await import(
    "../repositories/refresh-token.repository.js"
  );
  const userServiceModule = await import("../services/user.service.js");
  const userRepositoryModule = await import("../repositories/user.repository.js");
  const notificationServiceModule = await import("../services/notification.service.js");
  const costServiceModule = await import("../services/cost.service.js");
  const subscriptionServiceModule = await import("../services/subscription.service.js");
  const jwtModule = await import("../utils/jwt.js");
  const cookieModule = await import("../config/cookies.js");

  userRepositoryModule.userRepository.findById = async () => buildStoredUser();
  refreshTokenRepositoryModule.refreshTokenRepository.findActiveById = async () => ({
    id: "session-current",
    userId: "user-123",
    tokenHash: "token-hash",
    userAgent: "Mozilla/5.0",
    ipAddress: "127.0.0.1",
    lastUsedAt: new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: new Date("2027-01-01T00:00:00.000Z"),
    revokedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });

  const { app } = await import("../app.js");

  return {
    app,
    authService: authServiceModule.authService,
    authEmailService: authEmailServiceModule.authEmailService,
    userService: userServiceModule.userService,
    userRepository: userRepositoryModule.userRepository,
    notificationService: notificationServiceModule.notificationService,
    costService: costServiceModule.costService,
    subscriptionService: subscriptionServiceModule.subscriptionService,
    signAccessToken: jwtModule.signAccessToken,
    accessCookieName: cookieModule.ACCESS_TOKEN_COOKIE_NAME,
    refreshCookieName: cookieModule.REFRESH_TOKEN_COOKIE_NAME,
  };
};

beforeEach(async () => {
  const { clearRateLimitState } = await import("../middlewares/rate-limit.middleware.js");
  clearRateLimitState();
});

after(async () => {
  ensureTestEnv();
  const { pool } = await import("../config/db.js");
  await pool.end();
});

test("GET /api/v1/health returns the health payload", async () => {
  const { app } = await loadModules();

  const response = await request(app).get("/api/v1/health");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { message: "API is running" });
});

test("GET /api/v1/health adds a request id header", async () => {
  const { app } = await loadModules();

  const response = await request(app).get("/api/v1/health");

  assert.equal(typeof response.headers["x-request-id"], "string");
  assert.ok(String(response.headers["x-request-id"]).length > 0);
});

test("GET /api/v1/auth/csrf-token returns a token and sets a cookie", async () => {
  const { app } = await loadModules();

  const response = await request(app).get("/api/v1/auth/csrf-token");

  assert.equal(response.status, 200);
  assert.equal(typeof response.body.csrfToken, "string");
  assert.ok(response.body.csrfToken.length > 0);
  assert.ok(response.headers["set-cookie"]);
});

test("POST /api/v1/auth/register requires a CSRF token", async () => {
  const { app } = await loadModules();

  const response = await request(app).post("/api/v1/auth/register").send({
    email: "test@example.com",
    password: "Password123!",
    firstName: "Test",
    lastName: "User",
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.message, "Invalid CSRF token");
});

test("POST /api/v1/auth/register sets auth cookies for browser clients", async () => {
  const { app, authService, accessCookieName, refreshCookieName } =
    await loadModules();
  const originalRegister = authService.register;
  let capturedEmail: string | null = null;

  authService.register = async (input) => {
    capturedEmail = input.email;
    return buildAuthResult();
  };
  try {
    const agent = request.agent(app);
    const csrfResponse = await agent.get("/api/v1/auth/csrf-token");

    const response = await agent
      .post("/api/v1/auth/register")
      .set("x-csrf-token", csrfResponse.body.csrfToken)
      .send({
        email: "test@example.com",
        password: "Password123!",
        firstName: "Test",
        lastName: "User",
      });

    const setCookieHeaders = getSetCookieHeaders(
      response.headers as Record<string, unknown>,
    );

    assert.equal(response.status, 201);
    assert.equal(capturedEmail, "test@example.com");
    assert.equal(response.body.user.email, "test@example.com");
    assert.ok(setCookieHeaders.some((value) => value.startsWith(`${accessCookieName}=`)));
    assert.ok(
      setCookieHeaders.some((value) => value.startsWith(`${refreshCookieName}=`)),
    );
  } finally {
    authService.register = originalRegister;
  }
});

test("POST /api/v1/auth/login sets auth cookies for browser clients", async () => {
  const { app, authService, accessCookieName } = await loadModules();
  const originalLogin = authService.login;

  authService.login = async () => buildAuthResult();
  try {
    const agent = request.agent(app);
    const csrfResponse = await agent.get("/api/v1/auth/csrf-token");

    const response = await agent
      .post("/api/v1/auth/login")
      .set("x-csrf-token", csrfResponse.body.csrfToken)
      .send({
        email: "test@example.com",
        password: "Password123!",
      });

    const setCookieHeaders = getSetCookieHeaders(
      response.headers as Record<string, unknown>,
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.user.email, "test@example.com");
    assert.ok(setCookieHeaders.some((value) => value.startsWith(`${accessCookieName}=`)));
  } finally {
    authService.login = originalLogin;
  }
});

test("POST /api/v1/auth/refresh-token uses the refresh cookie and returns the user", async () => {
  const { app, authService, refreshCookieName } = await loadModules();
  const originalRefreshAccessToken = authService.refreshAccessToken;

  let capturedToken: string | null = null;
  authService.refreshAccessToken = async (token) => {
    capturedToken = token;
    return buildAuthResult();
  };
  try {
    const agent = request.agent(app);
    const csrfResponse = await agent.get("/api/v1/auth/csrf-token");

    const response = await agent
      .post("/api/v1/auth/refresh-token")
      .set("x-csrf-token", csrfResponse.body.csrfToken)
      .set("Cookie", `${refreshCookieName}=cookie-refresh-token`)
      .send({});

    assert.equal(response.status, 200);
    assert.equal(capturedToken, "cookie-refresh-token");
    assert.equal(response.body.user.email, "test@example.com");
  } finally {
    authService.refreshAccessToken = originalRefreshAccessToken;
  }
});

test("POST /api/v1/auth/logout clears auth cookies", async () => {
  const { app, authService, refreshCookieName, accessCookieName } =
    await loadModules();
  const originalLogout = authService.logout;

  let capturedToken: string | null = null;
  authService.logout = async (token) => {
    capturedToken = token;
  };
  try {
    const agent = request.agent(app);
    const csrfResponse = await agent.get("/api/v1/auth/csrf-token");

    const response = await agent
      .post("/api/v1/auth/logout")
      .set("x-csrf-token", csrfResponse.body.csrfToken)
      .set(
        "Cookie",
        `${accessCookieName}=cookie-access-token; ${refreshCookieName}=cookie-refresh-token`,
      )
      .send({});

    const setCookieHeaders = getSetCookieHeaders(
      response.headers as Record<string, unknown>,
    );

    assert.equal(response.status, 200);
    assert.equal(capturedToken, "cookie-refresh-token");
    assert.equal(response.body.message, "Logged out successfully");
    assert.ok(setCookieHeaders.some((value) => value.startsWith(`${accessCookieName}=;`)));
  } finally {
    authService.logout = originalLogout;
  }
});

test("POST /api/v1/auth/mobile/register returns a token pair", async () => {
  const { app, authService } = await loadModules();
  const originalRegister = authService.register;

  authService.register = async () => buildAuthResult();
  try {
    const response = await request(app).post("/api/v1/auth/mobile/register").send({
      email: "test@example.com",
      password: "Password123!",
      firstName: "Test",
      lastName: "User",
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.tokens.accessToken, "access-token");
  } finally {
    authService.register = originalRegister;
  }
});

test("POST /api/v1/auth/mobile/login returns a token pair without CSRF", async () => {
  const { app, authService } = await loadModules();
  const originalLogin = authService.login;

  authService.login = async () => buildAuthResult();
  try {
    const response = await request(app).post("/api/v1/auth/mobile/login").send({
      email: "test@example.com",
      password: "Password123!",
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.tokens.refreshToken, "refresh-token");
  } finally {
    authService.login = originalLogin;
  }
});

test("POST /api/v1/auth/mobile/refresh-token returns a new token pair", async () => {
  const { app, authService } = await loadModules();
  const originalRefreshAccessToken = authService.refreshAccessToken;

  authService.refreshAccessToken = async () => buildAuthResult();
  try {
    const response = await request(app)
      .post("/api/v1/auth/mobile/refresh-token")
      .send({
        refreshToken: "existing-refresh-token",
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.tokens.accessToken, "access-token");
  } finally {
    authService.refreshAccessToken = originalRefreshAccessToken;
  }
});

test("POST /api/v1/auth/forgot-password always returns a generic success message", async () => {
  const { app, authService } = await loadModules();
  const originalRequestPasswordReset = authService.requestPasswordReset;

  let capturedEmail: string | null = null;
  authService.requestPasswordReset = async (email) => {
    capturedEmail = email;
  };

  try {
    const response = await request(app).post("/api/v1/auth/forgot-password").send({
      email: "test@example.com",
    });

    assert.equal(response.status, 200);
    assert.equal(capturedEmail, "test@example.com");
    assert.equal(
      response.body.message,
      "If an account exists for that email, a password reset link has been sent.",
    );
  } finally {
    authService.requestPasswordReset = originalRequestPasswordReset;
  }
});

test("POST /api/v1/auth/reset-password resets the password", async () => {
  const { app, authService } = await loadModules();
  const originalResetPassword = authService.resetPassword;

  let capturedToken: string | null = null;
  let capturedPassword: string | null = null;
  authService.resetPassword = async (token, password) => {
    capturedToken = token;
    capturedPassword = password;
  };

  try {
    const response = await request(app).post("/api/v1/auth/reset-password").send({
      token: "reset-token",
      password: "NewPassword123!",
    });

    assert.equal(response.status, 200);
    assert.equal(capturedToken, "reset-token");
    assert.equal(capturedPassword, "NewPassword123!");
    assert.equal(response.body.message, "Password reset successfully");
  } finally {
    authService.resetPassword = originalResetPassword;
  }
});

test("POST /api/v1/auth/mobile/login is rate limited after repeated attempts", async () => {
  const { app, authService } = await loadModules();
  const originalLogin = authService.login;

  authService.login = async () => buildAuthResult();
  try {
    for (let index = 0; index < 10; index += 1) {
      const response = await request(app).post("/api/v1/auth/mobile/login").send({
        email: "test@example.com",
        password: "Password123!",
      });

      assert.equal(response.status, 200);
    }

    const limitedResponse = await request(app).post("/api/v1/auth/mobile/login").send({
      email: "test@example.com",
      password: "Password123!",
    });

    assert.equal(limitedResponse.status, 429);
    assert.equal(limitedResponse.body.code, "rate_limited");
    assert.equal(typeof limitedResponse.body.details.retryAfterSeconds, "number");
    assert.equal(typeof limitedResponse.body.requestId, "string");
  } finally {
    authService.login = originalLogin;
  }
});

test("GET /api/v1/auth/me returns the authenticated user from a cookie", async () => {
  const { app, authService, signAccessToken, accessCookieName } =
    await loadModules();
  const originalGetCurrentUser = authService.getCurrentUser;

  const user = buildUser();
  authService.getCurrentUser = async () => user;
  try {
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", [
        `${accessCookieName}=${accessToken}`,
        "underflow_refresh_token=session-current.raw.jwt",
      ]);

    assert.equal(response.status, 200);
    assert.equal(response.body.user.email, user.email);
  } finally {
    authService.getCurrentUser = originalGetCurrentUser;
  }
});

test("GET /api/v1/auth/me still accepts a bearer token for mobile compatibility", async () => {
  const { app, authService, signAccessToken } = await loadModules();
  const originalGetCurrentUser = authService.getCurrentUser;

  const user = buildUser();
  authService.getCurrentUser = async () => user;
  try {
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.user.email, user.email);
  } finally {
    authService.getCurrentUser = originalGetCurrentUser;
  }
});

test("PATCH /api/v1/users/me updates the current user profile", async () => {
  const { app, userService, signAccessToken } = await loadModules();
  const originalUpdateCurrentUser = userService.updateCurrentUser;

  const user = {
    ...buildUser(),
    firstName: "Updated",
  };

  userService.updateCurrentUser = async () => user;
  try {
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        firstName: "Updated",
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.firstName, "Updated");
  } finally {
    userService.updateCurrentUser = originalUpdateCurrentUser;
  }
});

test("PATCH /api/v1/users/me/password updates the current user password", async () => {
  const { app, userService, signAccessToken } = await loadModules();
  const originalUpdatePassword = userService.updatePassword;

  userService.updatePassword = async () => {};
  try {
    const user = buildUser();
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .patch("/api/v1/users/me/password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "NewPassword123!",
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.message, "Password updated successfully");
  } finally {
    userService.updatePassword = originalUpdatePassword;
  }
});

test("GET /api/v1/users/me/preferences returns notification preferences", async () => {
  const { app, userService, signAccessToken } = await loadModules();
  const originalGetNotificationPreferences = userService.getNotificationPreferences;

  userService.getNotificationPreferences = async () => ({
    costAlerts: true,
    driftReports: false,
    maintenance: true,
    featureReleases: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

  try {
    const user = buildUser();
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .get("/api/v1/users/me/preferences")
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.preferences.costAlerts, true);
    assert.equal(response.body.preferences.driftReports, false);
  } finally {
    userService.getNotificationPreferences = originalGetNotificationPreferences;
  }
});

test("PATCH /api/v1/users/me/preferences updates notification preferences", async () => {
  const { app, userService, signAccessToken } = await loadModules();
  const originalUpdateNotificationPreferences =
    userService.updateNotificationPreferences;

  userService.updateNotificationPreferences = async () => ({
    costAlerts: false,
    driftReports: true,
    maintenance: true,
    featureReleases: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  });

  try {
    const user = buildUser();
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .patch("/api/v1/users/me/preferences")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        costAlerts: false,
        driftReports: true,
        maintenance: true,
        featureReleases: true,
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.preferences.costAlerts, false);
    assert.equal(response.body.preferences.maintenance, true);
  } finally {
    userService.updateNotificationPreferences =
      originalUpdateNotificationPreferences;
  }
});

test("GET /api/v1/users/me/sessions returns active sessions", async () => {
  const { app, userService, signAccessToken, refreshCookieName } =
    await loadModules();
  const originalListSessions = userService.listSessions;

  userService.listSessions = async () => [
    {
      id: "session-current",
      deviceLabel: "Mac",
      userAgent: "Mozilla/5.0 (Macintosh)",
      ipAddress: "127.0.0.1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      lastUsedAt: new Date("2026-01-02T00:00:00.000Z"),
      revokedAt: null,
      isCurrent: true,
    },
  ];

  try {
    const user = buildUser();
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .get("/api/v1/users/me/sessions")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Cookie", `${refreshCookieName}=session-current.raw.jwt`);

    assert.equal(response.status, 200);
    assert.equal(response.body.sessions.length, 1);
    assert.equal(response.body.sessions[0].isCurrent, true);
  } finally {
    userService.listSessions = originalListSessions;
  }
});

test("DELETE /api/v1/users/me/sessions/:sessionId revokes a session", async () => {
  const { app, userService, signAccessToken } = await loadModules();
  const originalRevokeSession = userService.revokeSession;

  let revokedSessionId: string | null = null;
  userService.revokeSession = async (_userId, sessionId) => {
    revokedSessionId = sessionId;
  };

  try {
    const user = buildUser();
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .delete("/api/v1/users/me/sessions/session-2")
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(response.status, 200);
    assert.equal(revokedSessionId, "session-2");
  } finally {
    userService.revokeSession = originalRevokeSession;
  }
});

test("POST /api/v1/users/me/sessions/logout-others revokes all other sessions", async () => {
  const { app, userService, signAccessToken, refreshCookieName } =
    await loadModules();
  const originalLogoutOtherSessions = userService.logoutOtherSessions;

  let capturedCurrentSessionId: string | null = null;
  userService.logoutOtherSessions = async (_userId, currentSessionId) => {
    capturedCurrentSessionId = currentSessionId;
  };

  try {
    const user = buildUser();
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .post("/api/v1/users/me/sessions/logout-others")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Cookie", `${refreshCookieName}=session-current.raw.jwt`)
      .send({});

    assert.equal(response.status, 200);
    assert.equal(capturedCurrentSessionId, "session-current");
  } finally {
    userService.logoutOtherSessions = originalLogoutOtherSessions;
  }
});

test("POST /api/v1/users/me/request-account-deletion records a deletion request", async () => {
  const { app, userService, signAccessToken } = await loadModules();
  const originalRequestAccountDeletion = userService.requestAccountDeletion;

  let capturedUserId: string | null = null;
  userService.requestAccountDeletion = async (userId) => {
    capturedUserId = userId;
  };

  try {
    const user = buildUser();
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .post("/api/v1/users/me/request-account-deletion")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    assert.equal(response.status, 200);
    assert.equal(capturedUserId, "user-123");
    assert.equal(
      response.body.message,
      "Account deletion request submitted successfully",
    );
  } finally {
    userService.requestAccountDeletion = originalRequestAccountDeletion;
  }
});

test("GET /api/v1/notifications returns the notifications feed", async () => {
  const { app, notificationService, signAccessToken } = await loadModules();
  const originalGetFeedForUser = notificationService.getFeedForUser;

  notificationService.getFeedForUser = async (): Promise<NotificationFeedItem[]> => [
    {
      id: "delivery-1",
      alertEventId: "event-1",
      channel: "email",
      recipient: "alerts@example.com",
      status: "sent",
      sentAt: new Date("2026-01-02T09:00:00.000Z"),
      errorMessage: null,
      createdAt: new Date("2026-01-02T09:00:00.000Z"),
      workspaceId: "workspace-1",
      workspaceName: "Platform",
      alertId: "alert-1",
      alertName: "Budget threshold",
      awsAccountId: "aws-1",
      awsAccountName: "Production",
      triggeredAt: new Date("2026-01-02T08:59:00.000Z"),
    },
  ];

  try {
    const user = buildUser();
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .get("/api/v1/notifications?limit=10")
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.notifications.length, 1);
    assert.equal(response.body.notifications[0].workspaceName, "Platform");
  } finally {
    notificationService.getFeedForUser = originalGetFeedForUser;
  }
});

test("GET /api/v1/workspaces/:workspaceId/sync-history returns sync runs", async () => {
  const { app, costService, signAccessToken } = await loadModules();
  const originalGetSyncHistoryForWorkspace = costService.getSyncHistoryForWorkspace;

  costService.getSyncHistoryForWorkspace = async (): Promise<SyncHistoryItem[]> => [
    {
      id: "run-1",
      awsAccountId: "aws-1",
      awsAccountName: "Production",
      accountNumber: "123456789012",
      status: "completed",
      startedAt: new Date("2026-01-02T09:00:00.000Z"),
      finishedAt: new Date("2026-01-02T09:03:00.000Z"),
      errorMessage: null,
    },
  ];

  try {
    const user = buildUser();
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .get("/api/v1/workspaces/workspace-1/sync-history?limit=5")
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.syncRuns.length, 1);
    assert.equal(response.body.syncRuns[0].status, "completed");
  } finally {
    costService.getSyncHistoryForWorkspace = originalGetSyncHistoryForWorkspace;
  }
});

test("POST /api/v1/subscriptions/checkout-session returns a checkout URL", async () => {
  const { app, subscriptionService, signAccessToken } = await loadModules();
  const originalCreateCheckoutSession = subscriptionService.createCheckoutSession;

  subscriptionService.createCheckoutSession = async () => ({
    checkoutUrl: "https://checkout.stripe.test/session",
  });
  try {
    const user = buildUser();
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .post("/api/v1/subscriptions/checkout-session")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ priceId: "price_pro" });

    assert.equal(response.status, 200);
    assert.equal(response.body.checkoutUrl, "https://checkout.stripe.test/session");
  } finally {
    subscriptionService.createCheckoutSession = originalCreateCheckoutSession;
  }
});

test("POST /api/v1/subscriptions/checkout-session rejects unsupported price IDs", async () => {
  const { app, signAccessToken } = await loadModules();
  const user = buildUser();
  const accessToken = signAccessToken(buildAuthenticatedClaims(user));

  const response = await request(app)
    .post("/api/v1/subscriptions/checkout-session")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ priceId: "price_unknown" });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Unsupported billing price");
});

test("POST /api/v1/subscriptions/portal-session returns a portal URL", async () => {
  const { app, subscriptionService, signAccessToken } = await loadModules();
  const originalCreatePortalSession = subscriptionService.createPortalSession;

  subscriptionService.createPortalSession = async () => ({
    portalUrl: "https://billing.stripe.test/portal",
  });
  try {
    const user = buildUser();
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .post("/api/v1/subscriptions/portal-session")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    assert.equal(response.status, 200);
    assert.equal(response.body.portalUrl, "https://billing.stripe.test/portal");
  } finally {
    subscriptionService.createPortalSession = originalCreatePortalSession;
  }
});

test("GET /api/v1/subscriptions/current returns the current subscription", async () => {
  const { app, subscriptionService, signAccessToken } = await loadModules();
  const originalGetCurrentSubscription = subscriptionService.getCurrentSubscription;

  subscriptionService.getCurrentSubscription = async () => ({
    subscription: {
      id: "sub-db-id",
      userId: "user-123",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      stripePriceId: "price_123",
      status: "active",
      currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    plan: {
      key: "pro",
      name: "Pro",
      priceId: "price_pro",
    },
  });
  try {
    const user = buildUser();
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .get("/api/v1/subscriptions/current")
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.subscription.status, "active");
    assert.equal(response.body.plan.key, "pro");
  } finally {
    subscriptionService.getCurrentSubscription = originalGetCurrentSubscription;
  }
});

test("POST /api/v1/subscriptions/cancel returns the canceled subscription state", async () => {
  const { app, subscriptionService, signAccessToken } = await loadModules();
  const originalCancelCurrentSubscription =
    subscriptionService.cancelCurrentSubscription;

  subscriptionService.cancelCurrentSubscription = async () => ({
    subscription: {
      id: "sub-db-id",
      userId: "user-123",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      stripePriceId: "price_123",
      status: "active",
      currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
      cancelAtPeriodEnd: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    plan: {
      key: "pro",
      name: "Pro",
      priceId: "price_pro",
    },
  });
  try {
    const user = buildUser();
    const accessToken = signAccessToken(buildAuthenticatedClaims(user));

    const response = await request(app)
      .post("/api/v1/subscriptions/cancel")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    assert.equal(response.status, 200);
    assert.equal(response.body.subscription.cancelAtPeriodEnd, true);
    assert.equal(response.body.plan.key, "pro");
  } finally {
    subscriptionService.cancelCurrentSubscription = originalCancelCurrentSubscription;
  }
});

test("POST /api/v1/subscriptions/webhook/stripe acknowledges webhook events", async () => {
  const { app, subscriptionService } = await loadModules();
  const originalHandleStripeWebhook = subscriptionService.handleStripeWebhook;

  let capturedSignature: string | undefined;
  let capturedPayload: Buffer | null = null;
  subscriptionService.handleStripeWebhook = async (signature, payload) => {
    capturedSignature = signature;
    capturedPayload = payload;
  };
  try {
    const rawPayload = JSON.stringify({ id: "evt_123" });
    const response = await request(app)
      .post("/api/v1/subscriptions/webhook/stripe")
      .set("stripe-signature", "test-signature")
      .set("Content-Type", "application/json")
      .send(rawPayload);

    assert.equal(response.status, 200);
    assert.equal(capturedSignature, "test-signature");
    assert.ok(Buffer.isBuffer(capturedPayload));
    assert.deepEqual(capturedPayload, Buffer.from(rawPayload));
  } finally {
    subscriptionService.handleStripeWebhook = originalHandleStripeWebhook;
  }
});

test("missing routes return the standardized error envelope", async () => {
  const { app } = await loadModules();

  const response = await request(app).get("/api/v1/does-not-exist");

  assert.equal(response.status, 404);
  assert.equal(response.body.code, "route_not_found");
  assert.equal(typeof response.body.requestId, "string");
});

test("unexpected errors return a safe 500 envelope", async () => {
  const { app, authService } = await loadModules();
  const originalLogin = authService.login;

  authService.login = async () => {
    throw new Error("sensitive database issue");
  };

  try {
    const response = await request(app).post("/api/v1/auth/mobile/login").send({
      email: "test@example.com",
      password: "Password123!",
    });

    assert.equal(response.status, 500);
    assert.equal(response.body.message, "Internal server error");
    assert.equal(response.body.code, "internal_error");
    assert.equal(response.body.details, null);
    assert.equal(typeof response.body.requestId, "string");
  } finally {
    authService.login = originalLogin;
  }
});
