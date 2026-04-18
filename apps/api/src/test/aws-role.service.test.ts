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

const buildAwsAccount = (overrides: Partial<AwsAccount> = {}): AwsAccount => ({
  id: "aws-1",
  workspaceId: "workspace-1",
  name: "Production",
  awsAccountId: "123456789012",
  roleArn: "arn:aws:iam::123456789012:role/UnderflowCostExplorerRead",
  externalId: "underflow-dev-shared-secret",
  status: "pending",
  lastVerifiedAt: null,
  lastSyncAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

const loadModules = async () => {
  ensureTestEnv();

  const [{ awsCredentialsService }, { awsRoleService }] = await Promise.all([
    import("../services/aws-credentials.service.js"),
    import("../services/aws-role.service.js"),
  ]);

  return { awsCredentialsService, awsRoleService };
};

test("assumeRole sends RoleArn, optional ExternalId, and deterministic session name", async () => {
  const { awsCredentialsService } = await loadModules();
  const originalBuildBaseStsClient = awsCredentialsService.buildBaseStsClient;
  let capturedInput: Record<string, unknown> | undefined;

  awsCredentialsService.buildBaseStsClient = () =>
    ({
      send: async (command: { input: Record<string, unknown> }) => {
        capturedInput = command.input;
        return {
          Credentials: {
            AccessKeyId: "temp-key",
            SecretAccessKey: "temp-secret",
            SessionToken: "temp-token",
            Expiration: new Date("2026-01-01T01:00:00.000Z"),
          },
        };
      },
    }) as Pick<import("@aws-sdk/client-sts").STSClient, "send">;

  try {
    const session = await awsCredentialsService.assumeRole(buildAwsAccount(), "verify");

    assert.equal(capturedInput?.RoleArn, "arn:aws:iam::123456789012:role/UnderflowCostExplorerRead");
    assert.equal(capturedInput?.ExternalId, "underflow-dev-shared-secret");
    assert.equal(capturedInput?.RoleSessionName, "underflow-verify");
    assert.equal(session.credentials.accessKeyId, "temp-key");
    assert.equal(session.credentials.sessionToken, "temp-token");
  } finally {
    awsCredentialsService.buildBaseStsClient = originalBuildBaseStsClient;
  }
});

test("verifyConnection uses temporary credentials returned by AssumeRole", async () => {
  const { awsCredentialsService, awsRoleService } = await loadModules();
  const originalAssumeRole = awsCredentialsService.assumeRole;
  const originalBuildStsClient = awsRoleService.buildStsClient;
  let capturedCredentials: AssumedRoleSession["credentials"] | undefined;

  awsCredentialsService.assumeRole = async () => ({
    credentials: {
      accessKeyId: "temp-key",
      secretAccessKey: "temp-secret",
      sessionToken: "temp-token",
    },
    expiration: new Date("2026-01-01T01:00:00.000Z"),
  });

  awsRoleService.buildStsClient = (credentials) =>
    ({
      send: async () => {
        capturedCredentials = credentials;
        return { Account: "123456789012" };
      },
    }) as Pick<import("@aws-sdk/client-sts").STSClient, "send">;

  try {
    await awsRoleService.verifyConnection(buildAwsAccount());

    assert.deepEqual(capturedCredentials, {
      accessKeyId: "temp-key",
      secretAccessKey: "temp-secret",
      sessionToken: "temp-token",
    });
  } finally {
    awsCredentialsService.assumeRole = originalAssumeRole;
    awsRoleService.buildStsClient = originalBuildStsClient;
  }
});

test("verifyConnection fails when the assumed role resolves to a different AWS account", async () => {
  const { awsCredentialsService, awsRoleService } = await loadModules();
  const originalAssumeRole = awsCredentialsService.assumeRole;
  const originalBuildStsClient = awsRoleService.buildStsClient;

  awsCredentialsService.assumeRole = async () => ({
    credentials: {
      accessKeyId: "temp-key",
      secretAccessKey: "temp-secret",
      sessionToken: "temp-token",
    },
    expiration: new Date("2026-01-01T01:00:00.000Z"),
  });

  awsRoleService.buildStsClient = () =>
    ({
      send: async () => ({ Account: "999999999999" }),
    }) as Pick<import("@aws-sdk/client-sts").STSClient, "send">;

  try {
    await assert.rejects(
      () => awsRoleService.verifyConnection(buildAwsAccount()),
      (error: unknown) =>
        error instanceof Error &&
        "code" in error &&
        error.code === "aws_account_mismatch",
    );
  } finally {
    awsCredentialsService.assumeRole = originalAssumeRole;
    awsRoleService.buildStsClient = originalBuildStsClient;
  }
});

test("assumeRole classifies external ID access failures clearly", async () => {
  const { awsCredentialsService } = await loadModules();
  const originalBuildBaseStsClient = awsCredentialsService.buildBaseStsClient;

  awsCredentialsService.buildBaseStsClient = () =>
    ({
      send: async () => {
        const error = new Error("Not authorized to perform sts:AssumeRole with ExternalId");
        (error as Error & { name: string }).name = "AccessDenied";
        throw error;
      },
    }) as Pick<import("@aws-sdk/client-sts").STSClient, "send">;

  try {
    await assert.rejects(
      () => awsCredentialsService.assumeRole(buildAwsAccount(), "verify"),
      (error: unknown) =>
        error instanceof Error &&
        "code" in error &&
        error.code === "aws_external_id_invalid",
    );
  } finally {
    awsCredentialsService.buildBaseStsClient = originalBuildBaseStsClient;
  }
});
