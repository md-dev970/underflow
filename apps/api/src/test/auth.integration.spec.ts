import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before, beforeEach } from "node:test";

import dotenv from "dotenv";
import request from "supertest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const resolveTestDatabaseUrl = (): string => {
  const value =
    process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL;

  if (!value) {
    throw new Error(
      "TEST_DATABASE_URL or DATABASE_URL must be set before running test:db",
    );
  }

  return value;
};

const ensureIntegrationEnv = (): void => {
  process.env.NODE_ENV = "test";
  const testDatabaseUrl = resolveTestDatabaseUrl();
  process.env.TEST_DATABASE_URL = testDatabaseUrl;
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.CSRF_SECRET ??= "integration-csrf-secret";
  process.env.JWT_ACCESS_SECRET ??= "integration-access-secret";
  process.env.JWT_REFRESH_SECRET ??= "integration-refresh-secret";
  process.env.JWT_ACCESS_EXPIRES_IN ??= "15m";
  process.env.JWT_REFRESH_EXPIRES_IN ??= "7d";
  process.env.CLIENT_URL ??= "http://localhost:5173";
  process.env.AUTH_COOKIE_SAME_SITE ??= "lax";
};

const loadAppAndPool = async () => {
  ensureIntegrationEnv();

  const [{ app }, dbModule] = await Promise.all([
    import("../app.js"),
    import("../config/db.js"),
  ]);

  return {
    app,
    pool: dbModule.pool,
  };
};

const applySchema = async (): Promise<void> => {
  const { runMigrations } = await import("../db/migrate.js");
  await runMigrations();
};

const getCookieValue = (
  headers: Record<string, unknown>,
  cookieName: string,
): string | null => {
  const setCookieHeader = headers["set-cookie"];
  const cookieHeaders = Array.isArray(setCookieHeader)
    ? setCookieHeader.filter((value): value is string => typeof value === "string")
    : typeof setCookieHeader === "string"
      ? [setCookieHeader]
      : [];

  for (const header of cookieHeaders) {
    if (header.startsWith(`${cookieName}=`)) {
      return header.split(";")[0]?.slice(cookieName.length + 1) ?? null;
    }
  }

  return null;
};

const truncateTables = async (): Promise<void> => {
  const { pool } = await loadAppAndPool();

  await pool.query(`
    TRUNCATE TABLE
      user_notification_preferences,
      refresh_tokens,
      password_reset_tokens,
      payments,
      subscriptions,
      users
    RESTART IDENTITY CASCADE
  `);
};

before(async () => {
  await applySchema();
});

beforeEach(async () => {
  await truncateTables();
});

after(async () => {
  const { pool } = await loadAppAndPool();
  await pool.end();
});

test("browser auth flow works end to end against PostgreSQL", async () => {
  const { app } = await loadAppAndPool();
  const agent = request.agent(app);

  const csrfResponse = await agent.get("/api/v1/auth/csrf-token");
  assert.equal(csrfResponse.status, 200);

  const registerResponse = await agent
    .post("/api/v1/auth/register")
    .set("x-csrf-token", csrfResponse.body.csrfToken)
    .send({
      email: "browser@example.com",
      password: "Password123!",
      firstName: "Browser",
      lastName: "User",
    });

  assert.equal(registerResponse.status, 201);
  assert.equal(registerResponse.body.user.email, "browser@example.com");

  const meResponse = await agent.get("/api/v1/auth/me");
  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.user.email, "browser@example.com");

  const refreshResponse = await agent
    .post("/api/v1/auth/refresh-token")
    .set("x-csrf-token", csrfResponse.body.csrfToken)
    .send({});
  assert.equal(refreshResponse.status, 200);
  assert.equal(refreshResponse.body.user.email, "browser@example.com");

  const logoutResponse = await agent
    .post("/api/v1/auth/logout")
    .set("x-csrf-token", csrfResponse.body.csrfToken)
    .send({});
  assert.equal(logoutResponse.status, 200);

  const meAfterLogoutResponse = await agent.get("/api/v1/auth/me");
  assert.equal(meAfterLogoutResponse.status, 401);
});

test("mobile auth flow works end to end against PostgreSQL", async () => {
  const { app } = await loadAppAndPool();

  const registerResponse = await request(app)
    .post("/api/v1/auth/mobile/register")
    .send({
      email: "mobile@example.com",
      password: "Password123!",
      firstName: "Mobile",
      lastName: "User",
    });

  assert.equal(registerResponse.status, 201);
  assert.equal(registerResponse.body.user.email, "mobile@example.com");
  assert.equal(typeof registerResponse.body.tokens.accessToken, "string");

  const meResponse = await request(app)
    .get("/api/v1/auth/me")
    .set(
      "Authorization",
      `Bearer ${registerResponse.body.tokens.accessToken as string}`,
    );

  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.user.email, "mobile@example.com");

  const refreshResponse = await request(app)
    .post("/api/v1/auth/mobile/refresh-token")
    .send({
      refreshToken: registerResponse.body.tokens.refreshToken,
    });

  assert.equal(refreshResponse.status, 200);
  assert.equal(refreshResponse.body.user.email, "mobile@example.com");
});

test("auth validation returns structured 400 responses", async () => {
  const { app } = await loadAppAndPool();

  const response = await request(app).post("/api/v1/auth/mobile/login").send({
    email: "not-an-email",
    password: "",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Validation failed");
  assert.ok(response.body.details);
});

test("authenticated user profile endpoints work against PostgreSQL", async () => {
  const { app } = await loadAppAndPool();

  const registerResponse = await request(app)
    .post("/api/v1/auth/mobile/register")
    .send({
      email: "profile@example.com",
      password: "Password123!",
      firstName: "Profile",
      lastName: "User",
    });

  assert.equal(registerResponse.status, 201);

  const accessToken = registerResponse.body.tokens.accessToken as string;

  const updateProfileResponse = await request(app)
    .patch("/api/v1/users/me")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      firstName: "Renamed",
      phone: "123456789",
    });

  assert.equal(updateProfileResponse.status, 200);
  assert.equal(updateProfileResponse.body.user.firstName, "Renamed");
  assert.equal(updateProfileResponse.body.user.phone, "123456789");

  const updatePasswordResponse = await request(app)
    .patch("/api/v1/users/me/password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      currentPassword: "Password123!",
      newPassword: "NewPassword123!",
    });

  assert.equal(updatePasswordResponse.status, 200);

  const oldPasswordLoginResponse = await request(app)
    .post("/api/v1/auth/mobile/login")
    .send({
      email: "profile@example.com",
      password: "Password123!",
    });

  assert.equal(oldPasswordLoginResponse.status, 401);

  const newPasswordLoginResponse = await request(app)
    .post("/api/v1/auth/mobile/login")
    .send({
      email: "profile@example.com",
      password: "NewPassword123!",
    });

  assert.equal(newPasswordLoginResponse.status, 200);
});

test("user preferences and session management endpoints work against PostgreSQL", async () => {
  const { app } = await loadAppAndPool();
  const agent = request.agent(app);
  const browserUserAgent = "Mozilla/5.0 (Macintosh)";

  const csrfResponse = await agent
    .get("/api/v1/auth/csrf-token")
    .set("User-Agent", browserUserAgent);
  assert.equal(csrfResponse.status, 200);

  const registerResponse = await agent
    .post("/api/v1/auth/register")
    .set("x-csrf-token", csrfResponse.body.csrfToken)
    .set("User-Agent", browserUserAgent)
    .send({
      email: "settings@example.com",
      password: "Password123!",
      firstName: "Settings",
      lastName: "User",
    });

  assert.equal(registerResponse.status, 201);

  const preferencesResponse = await agent.get("/api/v1/users/me/preferences");
  assert.equal(preferencesResponse.status, 200);
  assert.equal(preferencesResponse.body.preferences.costAlerts, true);
  assert.equal(preferencesResponse.body.preferences.maintenance, false);

  const updatePreferencesResponse = await agent
    .patch("/api/v1/users/me/preferences")
    .send({
      costAlerts: false,
      driftReports: true,
      maintenance: true,
      featureReleases: false,
    });

  assert.equal(updatePreferencesResponse.status, 200);
  assert.equal(updatePreferencesResponse.body.preferences.costAlerts, false);
  assert.equal(updatePreferencesResponse.body.preferences.maintenance, true);

  const sessionsResponse = await agent.get("/api/v1/users/me/sessions");
  assert.equal(sessionsResponse.status, 200);
  assert.equal(sessionsResponse.body.sessions.length, 1);
  assert.equal(sessionsResponse.body.sessions[0].isCurrent, true);

  const secondLoginResponse = await request(app)
    .post("/api/v1/auth/mobile/login")
    .set("User-Agent", "Mozilla/5.0 (iPhone)")
    .send({
      email: "settings@example.com",
      password: "Password123!",
    });

  assert.equal(secondLoginResponse.status, 200);

  const sessionsAfterSecondLogin = await agent.get("/api/v1/users/me/sessions");
  assert.equal(sessionsAfterSecondLogin.status, 200);
  assert.equal(sessionsAfterSecondLogin.body.sessions.length, 2);

  const otherSession = sessionsAfterSecondLogin.body.sessions.find(
    (session: { isCurrent: boolean }) => !session.isCurrent,
  );

  assert.ok(otherSession);

  const revokeResponse = await agent.delete(
    `/api/v1/users/me/sessions/${otherSession.id as string}`,
  );
  assert.equal(revokeResponse.status, 200);

  const sessionsAfterRevoke = await agent.get("/api/v1/users/me/sessions");
  assert.equal(sessionsAfterRevoke.status, 200);
  assert.equal(sessionsAfterRevoke.body.sessions.length, 1);

  const thirdLoginResponse = await request(app)
    .post("/api/v1/auth/mobile/login")
    .set("User-Agent", "Mozilla/5.0 (Windows)")
    .send({
      email: "settings@example.com",
      password: "Password123!",
    });

  assert.equal(thirdLoginResponse.status, 200);

  const logoutOthersResponse = await agent
    .post("/api/v1/users/me/sessions/logout-others")
    .send({});

  assert.equal(logoutOthersResponse.status, 200);

  const sessionsAfterLogoutOthers = await agent.get("/api/v1/users/me/sessions");
  assert.equal(sessionsAfterLogoutOthers.status, 200);
  assert.equal(sessionsAfterLogoutOthers.body.sessions.length, 1);
  assert.equal(sessionsAfterLogoutOthers.body.sessions[0].isCurrent, true);
});

test("forgot-password and reset-password work against PostgreSQL", async () => {
  const { app } = await loadAppAndPool();
  const { authEmailService } = await import("../services/auth-email.service.js");
  const originalSendPasswordResetEmail = authEmailService.sendPasswordResetEmail;
  const agent = request.agent(app);
  const browserUserAgent = "Mozilla/5.0 (Macintosh)";

  let capturedResetToken: string | null = null;
  authEmailService.sendPasswordResetEmail = async ({ token }) => {
    capturedResetToken = token;
  };

  try {
    const csrfResponse = await agent
      .get("/api/v1/auth/csrf-token")
      .set("User-Agent", browserUserAgent);

    assert.equal(csrfResponse.status, 200);

    const registerResponse = await agent
      .post("/api/v1/auth/register")
      .set("x-csrf-token", csrfResponse.body.csrfToken)
      .set("User-Agent", browserUserAgent)
      .send({
        email: "reset@example.com",
        password: "Password123!",
        firstName: "Reset",
        lastName: "User",
      });

    assert.equal(registerResponse.status, 201);
    const browserRefreshToken = getCookieValue(
      registerResponse.headers as Record<string, unknown>,
      "underflow_refresh_token",
    );

    assert.ok(browserRefreshToken);

    const forgotPasswordResponse = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({
        email: "reset@example.com",
      });

    assert.equal(forgotPasswordResponse.status, 200);
    assert.equal(
      forgotPasswordResponse.body.message,
      "If an account exists for that email, a password reset link has been sent.",
    );
    assert.ok(capturedResetToken);

    const resetPasswordResponse = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({
        token: capturedResetToken,
        password: "NewPassword123!",
      });

    assert.equal(resetPasswordResponse.status, 200);

    const oldSessionResponse = await agent.get("/api/v1/auth/me");

    assert.equal(oldSessionResponse.status, 401);

    const oldPasswordLoginResponse = await request(app)
      .post("/api/v1/auth/mobile/login")
      .send({
        email: "reset@example.com",
        password: "Password123!",
      });

    assert.equal(oldPasswordLoginResponse.status, 401);

    const newPasswordLoginResponse = await request(app)
      .post("/api/v1/auth/mobile/login")
      .send({
        email: "reset@example.com",
        password: "NewPassword123!",
      });

    assert.equal(newPasswordLoginResponse.status, 200);

    const refreshWithOldTokenResponse = await request(app)
      .post("/api/v1/auth/mobile/refresh-token")
      .send({
        refreshToken: browserRefreshToken,
      });

    assert.equal(refreshWithOldTokenResponse.status, 401);
  } finally {
    authEmailService.sendPasswordResetEmail = originalSendPasswordResetEmail;
  }
});
