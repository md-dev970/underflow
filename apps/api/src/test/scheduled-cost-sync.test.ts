import assert from "node:assert/strict";
import test from "node:test";

const ensureScheduledRuntimeEnv = (): void => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL ??=
    "postgresql://postgres:postgres@localhost:5432/underflow_test";
  process.env.DATABASE_SSL_ENABLED ??= "false";
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ??= "false";
  process.env.AWS_SES_REGION ??= "us-west-2";
  process.env.COST_SYNC_LOOKBACK_DAYS ??= "30";
  process.env.LOG_LEVEL ??= "info";
  delete process.env.CSRF_SECRET;
  delete process.env.JWT_ACCESS_SECRET;
  delete process.env.JWT_REFRESH_SECRET;
};

test("scheduled cost sync runner connects to the database and returns sync summary", async () => {
  ensureScheduledRuntimeEnv();

  const { runScheduledCostSync, scheduledCostSyncDependencies } = await import(
    "../jobs/scheduled-cost-sync.js"
  );

  const originalConnect = scheduledCostSyncDependencies.connectToDatabase;
  const originalSync = scheduledCostSyncDependencies.syncAllVerifiedAccounts;
  let connectCalls = 0;

  scheduledCostSyncDependencies.connectToDatabase = async () => {
    connectCalls += 1;
  };
  scheduledCostSyncDependencies.syncAllVerifiedAccounts = async () => ({
    scannedAccounts: 4,
    syncedAccounts: 3,
    skippedAccounts: 1,
    failedAccounts: 0,
  });

  try {
    const result = await runScheduledCostSync();
    assert.equal(connectCalls, 1);
    assert.deepEqual(result, {
      scannedAccounts: 4,
      syncedAccounts: 3,
      skippedAccounts: 1,
      failedAccounts: 0,
    });
  } finally {
    scheduledCostSyncDependencies.connectToDatabase = originalConnect;
    scheduledCostSyncDependencies.syncAllVerifiedAccounts = originalSync;
  }
});

test("scheduled cost sync Lambda handler returns a 200 with the sync summary body", async () => {
  ensureScheduledRuntimeEnv();

  const [{ handler }, { scheduledCostSyncDependencies }] = await Promise.all([
    import("../jobs/scheduled-cost-sync.lambda.js"),
    import("../jobs/scheduled-cost-sync.js"),
  ]);

  const originalConnect = scheduledCostSyncDependencies.connectToDatabase;
  const originalSync = scheduledCostSyncDependencies.syncAllVerifiedAccounts;

  scheduledCostSyncDependencies.connectToDatabase = async () => {};
  scheduledCostSyncDependencies.syncAllVerifiedAccounts = async () => ({
    scannedAccounts: 2,
    syncedAccounts: 2,
    skippedAccounts: 0,
    failedAccounts: 0,
  });

  try {
    const response = await handler();
    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      scannedAccounts: 2,
      syncedAccounts: 2,
      skippedAccounts: 0,
      failedAccounts: 0,
    });
  } finally {
    scheduledCostSyncDependencies.connectToDatabase = originalConnect;
    scheduledCostSyncDependencies.syncAllVerifiedAccounts = originalSync;
  }
});

test("scheduled cost sync Lambda handler surfaces failures", async () => {
  ensureScheduledRuntimeEnv();

  const [{ handler }, { scheduledCostSyncDependencies }] = await Promise.all([
    import("../jobs/scheduled-cost-sync.lambda.js"),
    import("../jobs/scheduled-cost-sync.js"),
  ]);

  const originalConnect = scheduledCostSyncDependencies.connectToDatabase;
  const originalSync = scheduledCostSyncDependencies.syncAllVerifiedAccounts;

  scheduledCostSyncDependencies.connectToDatabase = async () => {};
  scheduledCostSyncDependencies.syncAllVerifiedAccounts = async () => {
    throw new Error("sync exploded");
  };

  try {
    await assert.rejects(handler, /sync exploded/);
  } finally {
    scheduledCostSyncDependencies.connectToDatabase = originalConnect;
    scheduledCostSyncDependencies.syncAllVerifiedAccounts = originalSync;
  }
});

test("syncAllVerifiedAccounts returns per-account summary counts", async () => {
  ensureScheduledRuntimeEnv();

  const [
    { costService },
    { awsAccountRepository },
    { jobLockRepository },
    { costRepository },
    { costExplorerService },
  ] = await Promise.all([
    import("../services/cost.service.js"),
    import("../repositories/aws-account.repository.js"),
    import("../repositories/job-lock.repository.js"),
    import("../repositories/cost.repository.js"),
    import("../services/cost-explorer.service.js"),
  ]);

  const originalFindActive = awsAccountRepository.findActiveForSync;
  const originalUpdateLastSyncAt = awsAccountRepository.updateLastSyncAt;
  const originalLock = jobLockRepository.withAdvisoryLock;
  const originalCreateSyncRun = costRepository.createSyncRun;
  const originalCompleteSyncRun = costRepository.completeSyncRun;
  const originalReplaceSnapshots = costRepository.replaceSnapshots;
  const originalFetchCostData = costExplorerService.fetchCostData;

  let activeAccountIndex = 0;

  awsAccountRepository.findActiveForSync = async () => [
    {
      id: "account-1",
      workspaceId: "workspace-1",
      name: "Prod",
      awsAccountId: "111111111111",
      roleArn: "arn:aws:iam::111111111111:role/UnderflowCostExplorerRead",
      externalId: null,
      status: "verified",
      lastVerifiedAt: null,
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "account-2",
      workspaceId: "workspace-1",
      name: "Stage",
      awsAccountId: "222222222222",
      roleArn: "arn:aws:iam::222222222222:role/UnderflowCostExplorerRead",
      externalId: null,
      status: "verified",
      lastVerifiedAt: null,
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  awsAccountRepository.updateLastSyncAt = async () => {};
  jobLockRepository.withAdvisoryLock = async (_key, callback) => {
    activeAccountIndex += 1;

    if (activeAccountIndex === 2) {
      return { acquired: false };
    }

    return { acquired: true, result: await callback() };
  };
  costRepository.createSyncRun = async () => "sync-1";
  costRepository.completeSyncRun = async () => {};
  costRepository.replaceSnapshots = async ({ entries }) => entries.length;
  costExplorerService.fetchCostData = async () => [
    {
      usageDate: "2026-01-01",
      serviceName: "AmazonEC2",
      amount: 12.4,
      currency: "USD",
    },
  ];

  try {
    const result = await costService.syncAllVerifiedAccounts();
    assert.deepEqual(result, {
      scannedAccounts: 2,
      syncedAccounts: 1,
      skippedAccounts: 1,
      failedAccounts: 0,
    });
  } finally {
    awsAccountRepository.findActiveForSync = originalFindActive;
    awsAccountRepository.updateLastSyncAt = originalUpdateLastSyncAt;
    jobLockRepository.withAdvisoryLock = originalLock;
    costRepository.createSyncRun = originalCreateSyncRun;
    costRepository.completeSyncRun = originalCompleteSyncRun;
    costRepository.replaceSnapshots = originalReplaceSnapshots;
    costExplorerService.fetchCostData = originalFetchCostData;
  }
});
