import assert from "node:assert/strict";
import test, { after } from "node:test";

import request from "supertest";

const ensureTestEnv = (): void => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL ??=
    "postgresql://postgres:postgres@localhost:5432/underflow_test";
  process.env.CSRF_SECRET ??= "test-csrf-secret";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
  process.env.CLIENT_URL ??= "http://localhost:5173";
  process.env.BILLING_ENABLED ??= "false";
};

const buildUser = () => ({
  id: "user-123",
  email: "test@example.com",
  role: "customer" as const,
  sessionVersion: 1,
});

const buildStoredUser = () => ({
  id: "user-123",
  email: "test@example.com",
  passwordHash: "password-hash",
  firstName: "Test",
  lastName: "User",
  phone: null,
  avatarUrl: null,
  role: "customer" as const,
  isActive: true,
  isEmailVerified: false,
  passwordChangedAt: new Date("2025-01-01T00:00:00.000Z"),
  sessionVersion: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});

const buildWorkspace = () => ({
  id: "workspace-123",
  name: "My Workspace",
  slug: "my-workspace",
  ownerUserId: "user-123",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});

const buildAwsAccount = () => ({
  id: "11111111-1111-1111-1111-111111111111",
  workspaceId: "workspace-123",
  name: "Prod Account",
  awsAccountId: "123456789012",
  roleArn: "arn:aws:iam::123456789012:role/CostMonitor",
  externalId: null,
  status: "verified",
  lastVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  lastSyncAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});

const buildAlert = () => ({
  id: "22222222-2222-2222-2222-222222222222",
  workspaceId: "workspace-123",
  awsAccountId: null,
  name: "Monthly Budget",
  thresholdAmount: 100,
  currency: "USD",
  period: "monthly",
  recipientEmail: "alerts@example.com",
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});

const loadModules = async () => {
  ensureTestEnv();

  const [
    { app },
    workspaceServiceModule,
    costServiceModule,
    alertServiceModule,
    userRepositoryModule,
    jwtModule,
  ] = await Promise.all([
    import("../app.js"),
    import("../services/workspace.service.js"),
    import("../services/cost.service.js"),
    import("../services/alert.service.js"),
    import("../repositories/user.repository.js"),
    import("../utils/jwt.js"),
  ]);

  userRepositoryModule.userRepository.findById = async () => buildStoredUser();

  return {
    app,
    workspaceService: workspaceServiceModule.workspaceService,
    costService: costServiceModule.costService,
    alertService: alertServiceModule.alertService,
    userRepository: userRepositoryModule.userRepository,
    signAccessToken: jwtModule.signAccessToken,
  };
};

after(async () => {
  ensureTestEnv();
  const { pool } = await import("../config/db.js");
  await pool.end();
});

test("POST /api/v1/workspaces creates a workspace", async () => {
  const { app, workspaceService, signAccessToken } = await loadModules();
  const originalCreate = workspaceService.create;
  workspaceService.create = async () => buildWorkspace();

  try {
    const user = buildUser();
    const accessToken = signAccessToken(user);
    const response = await request(app)
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "My Workspace", slug: "my-workspace" });

    assert.equal(response.status, 201);
    assert.equal(response.body.workspace.slug, "my-workspace");
  } finally {
    workspaceService.create = originalCreate;
  }
});

test("POST /api/v1/workspaces/:workspaceId/aws-accounts rejects invalid AWS account payloads", async () => {
  const { app, signAccessToken } = await loadModules();
  const accessToken = signAccessToken(buildUser());

  const response = await request(app)
    .post("/api/v1/workspaces/workspace-123/aws-accounts")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name: "Broken", awsAccountId: "123", roleArn: "bad-arn" });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Validation failed");
});

test("POST /api/v1/aws-accounts/:id/sync triggers a manual sync", async () => {
  const { app, costService, signAccessToken } = await loadModules();
  const originalSync = costService.syncAwsAccountForUser;
  costService.syncAwsAccountForUser = async () => ({
    syncRunId: "sync-123",
    recordsSynced: 15,
  });

  try {
    const accessToken = signAccessToken(buildUser());
    const response = await request(app)
      .post("/api/v1/aws-accounts/11111111-1111-1111-1111-111111111111/sync")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ from: "2026-01-01", to: "2026-01-31" });

    assert.equal(response.status, 200);
    assert.equal(response.body.recordsSynced, 15);
  } finally {
    costService.syncAwsAccountForUser = originalSync;
  }
});

test("GET /api/v1/workspaces/:workspaceId/costs/summary returns cost summary data", async () => {
  const { app, costService, signAccessToken } = await loadModules();
  const originalSummary = costService.getSummaryForWorkspace;
  costService.getSummaryForWorkspace = async () => ({
    totalAmount: 42.5,
    currency: "USD",
    from: "2026-01-01",
    to: "2026-01-31",
  });

  try {
    const accessToken = signAccessToken(buildUser());
    const response = await request(app)
      .get("/api/v1/workspaces/workspace-123/costs/summary?from=2026-01-01&to=2026-01-31")
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.summary.totalAmount, 42.5);
  } finally {
    costService.getSummaryForWorkspace = originalSummary;
  }
});

test("POST /api/v1/workspaces/:workspaceId/alerts creates a budget alert", async () => {
  const { app, alertService, signAccessToken } = await loadModules();
  const originalCreate = alertService.createForWorkspace;
  alertService.createForWorkspace = async () => buildAlert();

  try {
    const accessToken = signAccessToken(buildUser());
    const response = await request(app)
      .post("/api/v1/workspaces/workspace-123/alerts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Monthly Budget",
        thresholdAmount: 100,
        recipientEmail: "alerts@example.com",
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.alert.thresholdAmount, 100);
  } finally {
    alertService.createForWorkspace = originalCreate;
  }
});
