import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before, beforeEach } from "node:test";

import dotenv from "dotenv";
import request from "supertest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const ensureEnv = (): void => {
  const dbUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set");
  }

  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = dbUrl;
  process.env.CSRF_SECRET ??= "integration-csrf-secret";
  process.env.JWT_ACCESS_SECRET ??= "integration-access-secret";
  process.env.JWT_REFRESH_SECRET ??= "integration-refresh-secret";
  process.env.CLIENT_URL ??= "http://localhost:5173";
  process.env.BILLING_ENABLED ??= "false";
};

const currentMonthTestDates = (): [string, string, string] => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return [
    `${year}-${month}-01`,
    `${year}-${month}-02`,
    `${year}-${month}-03`,
  ];
};

const loadModules = async () => {
  ensureEnv();

  const [
    { app },
    dbModule,
    costExplorerServiceModule,
    notificationServiceModule,
    alertServiceModule,
  ] = await Promise.all([
    import("../app.js"),
    import("../config/db.js"),
    import("../services/cost-explorer.service.js"),
    import("../services/notification.service.js"),
    import("../services/alert.service.js"),
  ]);

  return {
    app,
    pool: dbModule.pool,
    costExplorerService: costExplorerServiceModule.costExplorerService,
    notificationService: notificationServiceModule.notificationService,
    alertService: alertServiceModule.alertService,
  };
};

const applySchema = async (): Promise<void> => {
  const { runMigrations } = await import("../db/migrate.js");
  await runMigrations();
};

const truncateTables = async (): Promise<void> => {
  const { pool } = await loadModules();
  await pool.query(`
    TRUNCATE TABLE
      notification_deliveries,
      alert_events,
      budget_alerts,
      cost_snapshots,
      cost_sync_runs,
      aws_accounts,
      workspace_members,
      workspaces,
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
  const { pool } = await loadModules();
  await pool.end();
});

test("workspace, aws account, sync, reporting, and alerts work together against PostgreSQL", async () => {
  const { app, pool, costExplorerService, alertService } =
    await loadModules();
  const originalFetch = costExplorerService.fetchCostData;
  const [dayOne, dayTwo, dayThree] = currentMonthTestDates();

  costExplorerService.fetchCostData = async () => [
    { usageDate: dayOne, serviceName: "AmazonEC2", amount: 40, currency: "USD" },
    { usageDate: dayTwo, serviceName: "AmazonS3", amount: 30, currency: "USD" },
    { usageDate: dayThree, serviceName: "AmazonEC2", amount: 50, currency: "USD" },
  ];

  try {
    const registerResponse = await request(app)
      .post("/api/v1/auth/mobile/register")
      .send({
        email: "owner@example.com",
        password: "Password123!",
        firstName: "Owner",
        lastName: "User",
      });

    assert.equal(registerResponse.status, 201);
    const accessToken = registerResponse.body.tokens.accessToken as string;

    const workspaceResponse = await request(app)
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Acme Workspace",
        slug: "acme-workspace",
      });

    assert.equal(workspaceResponse.status, 201);
    const workspaceId = workspaceResponse.body.workspace.id as string;

    const awsAccountResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/aws-accounts`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Prod",
        awsAccountId: "123456789012",
        roleArn: "arn:aws:iam::123456789012:role/CostMonitor",
      });

    assert.equal(awsAccountResponse.status, 201);
    const awsAccountId = awsAccountResponse.body.awsAccount.id as string;

    const syncResponse = await request(app)
      .post(`/api/v1/aws-accounts/${awsAccountId}/sync`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        from: dayOne,
        to: dayThree,
      });

    assert.equal(syncResponse.status, 200);
    assert.equal(syncResponse.body.recordsSynced, 3);

    const summaryResponse = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/costs/summary?from=${dayOne}&to=${dayThree}`)
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(summaryResponse.status, 200);
    assert.equal(summaryResponse.body.summary.totalAmount, 120);

    const byServiceResponse = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/costs/by-service?from=${dayOne}&to=${dayThree}`)
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(byServiceResponse.status, 200);
    assert.equal(byServiceResponse.body.services.length, 2);

    const alertResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/alerts`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Budget",
        thresholdAmount: 100,
        recipientEmail: "alerts@example.com",
      });

    assert.equal(alertResponse.status, 201);

    await alertService.evaluateActiveAlerts();
    const alertEventsResult = await pool.query(
      "SELECT COUNT(*) AS count FROM alert_events",
    );
    const deliveriesResult = await pool.query(
      "SELECT COUNT(*) AS count FROM notification_deliveries",
    );

    assert.equal(Number(alertEventsResult.rows[0]?.count ?? 0), 1);
    assert.equal(Number(deliveriesResult.rows[0]?.count ?? 0), 1);
  } finally {
    costExplorerService.fetchCostData = originalFetch;
  }
});

test("notifications feed and sync history endpoints work against PostgreSQL", async () => {
  const { app, costExplorerService, alertService } = await loadModules();
  const originalFetch = costExplorerService.fetchCostData;
  const [dayOne, dayTwo, dayThree] = currentMonthTestDates();

  costExplorerService.fetchCostData = async () => [
    { usageDate: dayOne, serviceName: "AmazonEC2", amount: 55, currency: "USD" },
    { usageDate: dayTwo, serviceName: "AmazonS3", amount: 35, currency: "USD" },
    { usageDate: dayThree, serviceName: "AmazonEC2", amount: 25, currency: "USD" },
  ];

  try {
    const registerResponse = await request(app)
      .post("/api/v1/auth/mobile/register")
      .send({
        email: "feed@example.com",
        password: "Password123!",
        firstName: "Feed",
        lastName: "User",
      });

    assert.equal(registerResponse.status, 201);
    const accessToken = registerResponse.body.tokens.accessToken as string;

    const workspaceResponse = await request(app)
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Feed Workspace",
        slug: "feed-workspace",
      });

    assert.equal(workspaceResponse.status, 201);
    const workspaceId = workspaceResponse.body.workspace.id as string;

    const awsAccountResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/aws-accounts`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Ops",
        awsAccountId: "123456789012",
        roleArn: "arn:aws:iam::123456789012:role/CostMonitor",
      });

    assert.equal(awsAccountResponse.status, 201);
    const awsAccountId = awsAccountResponse.body.awsAccount.id as string;

    const syncResponse = await request(app)
      .post(`/api/v1/aws-accounts/${awsAccountId}/sync`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        from: dayOne,
        to: dayThree,
      });

    assert.equal(syncResponse.status, 200);

    const syncHistoryResponse = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/sync-history?limit=10`)
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(syncHistoryResponse.status, 200);
    assert.equal(syncHistoryResponse.body.syncRuns.length, 1);
    assert.equal(syncHistoryResponse.body.syncRuns[0].awsAccountName, "Ops");

    const alertResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/alerts`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Ops Budget",
        thresholdAmount: 100,
        recipientEmail: "alerts@example.com",
      });

    assert.equal(alertResponse.status, 201);

    await alertService.evaluateActiveAlerts();

    const notificationsResponse = await request(app)
      .get("/api/v1/notifications?limit=10")
      .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(notificationsResponse.status, 200);
    assert.equal(notificationsResponse.body.notifications.length, 1);
    assert.equal(notificationsResponse.body.notifications[0].workspaceName, "Feed Workspace");
    assert.equal(notificationsResponse.body.notifications[0].alertName, "Ops Budget");
  } finally {
    costExplorerService.fetchCostData = originalFetch;
  }
});

test("job safety prevents duplicate sync runs and duplicate alert events", async () => {
  const { app, pool, costExplorerService, alertService } = await loadModules();
  const originalFetch = costExplorerService.fetchCostData;
  const [dayOne, dayTwo] = currentMonthTestDates();

  costExplorerService.fetchCostData = async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
    return [
      { usageDate: dayOne, serviceName: "AmazonEC2", amount: 60, currency: "USD" },
      { usageDate: dayTwo, serviceName: "AmazonS3", amount: 50, currency: "USD" },
    ];
  };

  try {
    const registerResponse = await request(app)
      .post("/api/v1/auth/mobile/register")
      .send({
        email: "safety@example.com",
        password: "Password123!",
        firstName: "Safety",
        lastName: "User",
      });

    assert.equal(registerResponse.status, 201);
    const accessToken = registerResponse.body.tokens.accessToken as string;

    const workspaceResponse = await request(app)
      .post("/api/v1/workspaces")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Safety Workspace",
        slug: "safety-workspace",
      });

    assert.equal(workspaceResponse.status, 201);
    const workspaceId = workspaceResponse.body.workspace.id as string;

    const awsAccountResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/aws-accounts`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Safety Ops",
        awsAccountId: "123456789012",
        roleArn: "arn:aws:iam::123456789012:role/CostMonitor",
      });

    assert.equal(awsAccountResponse.status, 201);
    const awsAccountId = awsAccountResponse.body.awsAccount.id as string;

    const [firstSync, secondSync] = await Promise.all([
      request(app)
        .post(`/api/v1/aws-accounts/${awsAccountId}/sync`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ from: dayOne, to: dayTwo }),
      request(app)
        .post(`/api/v1/aws-accounts/${awsAccountId}/sync`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ from: dayOne, to: dayTwo }),
    ]);

    const syncStatuses = [firstSync.status, secondSync.status].sort();
    assert.deepEqual(syncStatuses, [200, 409]);

    const alertResponse = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/alerts`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Safety Budget",
        thresholdAmount: 100,
        recipientEmail: "alerts@example.com",
      });

    assert.equal(alertResponse.status, 201);

    await Promise.all([
      alertService.evaluateActiveAlerts(),
      alertService.evaluateActiveAlerts(),
    ]);

    const alertEventsResult = await pool.query(
      "SELECT COUNT(*) AS count FROM alert_events",
    );

    assert.equal(Number(alertEventsResult.rows[0]?.count ?? 0), 1);
  } finally {
    costExplorerService.fetchCostData = originalFetch;
  }
});
