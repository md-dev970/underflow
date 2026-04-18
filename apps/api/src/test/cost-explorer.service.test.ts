import assert from "node:assert/strict";
import test from "node:test";

import type { AwsAccount } from "../types/aws-account.types.js";
import type { AssumedRoleSession } from "../services/aws-credentials.service.js";

const ensureTestEnv = (): void => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/underflow_test";
  process.env.CSRF_SECRET ??= "test-csrf-secret";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
  process.env.CLIENT_URL ??= "http://localhost:5174";
  process.env.BILLING_ENABLED ??= "false";
};

const buildAwsAccount = (): AwsAccount => ({
  id: "aws-1",
  workspaceId: "workspace-1",
  name: "Production",
  awsAccountId: "123456789012",
  roleArn: "arn:aws:iam::123456789012:role/UnderflowCostExplorerRead",
  externalId: null,
  status: "verified",
  lastVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  lastSyncAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});

const loadModules = async () => {
  ensureTestEnv();

  const [{ awsCredentialsService }, { costExplorerService }] = await Promise.all([
    import("../services/aws-credentials.service.js"),
    import("../services/cost-explorer.service.js"),
  ]);

  return { awsCredentialsService, costExplorerService };
};

test("fetchCostData uses assumed-role credentials for Cost Explorer syncs", async () => {
  const { awsCredentialsService, costExplorerService } = await loadModules();
  const originalAssumeRole = awsCredentialsService.assumeRole;
  const originalBuildCostExplorerClient = costExplorerService.buildCostExplorerClient;
  let capturedCredentials: AssumedRoleSession["credentials"] | undefined;
  let capturedPurpose: string | undefined;

  awsCredentialsService.assumeRole = async (_account, purpose) => {
    capturedPurpose = purpose;
    return {
      credentials: {
        accessKeyId: "temp-key",
        secretAccessKey: "temp-secret",
        sessionToken: "temp-token",
      },
      expiration: new Date("2026-01-01T01:00:00.000Z"),
    };
  };

  costExplorerService.buildCostExplorerClient = (credentials) =>
    ({
      send: async () => {
        capturedCredentials = credentials;
        return {
          ResultsByTime: [
            {
              TimePeriod: { Start: "2026-01-01", End: "2026-01-02" },
              Groups: [
                {
                  Keys: ["Amazon EC2"],
                  Metrics: {
                    UnblendedCost: {
                      Amount: "12.34",
                      Unit: "USD",
                    },
                  },
                },
              ],
            },
          ],
        };
      },
    }) as Pick<import("@aws-sdk/client-cost-explorer").CostExplorerClient, "send">;

  try {
    const entries = await costExplorerService.fetchCostData(
      buildAwsAccount(),
      "2026-01-01",
      "2026-01-31",
    );

    assert.equal(capturedPurpose, "sync");
    assert.deepEqual(capturedCredentials, {
      accessKeyId: "temp-key",
      secretAccessKey: "temp-secret",
      sessionToken: "temp-token",
    });
    assert.deepEqual(entries, [
      {
        usageDate: "2026-01-01",
        serviceName: "Amazon EC2",
        amount: 12.34,
        currency: "USD",
      },
    ]);
  } finally {
    awsCredentialsService.assumeRole = originalAssumeRole;
    costExplorerService.buildCostExplorerClient = originalBuildCostExplorerClient;
  }
});

test("fetchCostData surfaces Cost Explorer not enabled as a specific error", async () => {
  const { awsCredentialsService, costExplorerService } = await loadModules();
  const originalAssumeRole = awsCredentialsService.assumeRole;
  const originalBuildCostExplorerClient = costExplorerService.buildCostExplorerClient;

  awsCredentialsService.assumeRole = async () => ({
    credentials: {
      accessKeyId: "temp-key",
      secretAccessKey: "temp-secret",
      sessionToken: "temp-token",
    },
    expiration: new Date("2026-01-01T01:00:00.000Z"),
  });

  costExplorerService.buildCostExplorerClient = () =>
    ({
      send: async () => {
        throw new Error("Cost Explorer is not enabled for this account");
      },
    }) as Pick<import("@aws-sdk/client-cost-explorer").CostExplorerClient, "send">;

  try {
    await assert.rejects(
      () => costExplorerService.fetchCostData(buildAwsAccount(), "2026-01-01", "2026-01-31"),
      (error: unknown) =>
        error instanceof Error &&
        "code" in error &&
        error.code === "aws_cost_explorer_not_enabled",
    );
  } finally {
    awsCredentialsService.assumeRole = originalAssumeRole;
    costExplorerService.buildCostExplorerClient = originalBuildCostExplorerClient;
  }
});
