import assert from "node:assert/strict";
import test from "node:test";

const ensureTestEnv = (): void => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/underflow_test";
  process.env.CSRF_SECRET ??= "test-csrf-secret";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
  process.env.CLIENT_URL ??= "http://localhost:5174";
};

test("updateForUser resets verification when role metadata changes", async () => {
  ensureTestEnv();

  const [{ awsAccountService }, { awsAccountRepository }] = await Promise.all([
    import("../services/aws-account.service.js"),
    import("../repositories/aws-account.repository.js"),
  ]);

  const originalGetForUser = awsAccountService.getForUser;
  const originalUpdate = awsAccountRepository.update;
  let capturedResetVerification: boolean | undefined;

  awsAccountService.getForUser = async () => ({
    id: "aws-1",
    workspaceId: "workspace-1",
    name: "Prod",
    awsAccountId: "123456789012",
    roleArn: "arn:aws:iam::123456789012:role/Original",
    externalId: "old-external-id",
    status: "verified",
    lastVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
    lastSyncAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

  awsAccountRepository.update = async (_id, input, options) => {
    capturedResetVerification = options.resetVerification;
    return {
      id: "aws-1",
      workspaceId: "workspace-1",
      name: input.name,
      awsAccountId: input.awsAccountId,
      roleArn: input.roleArn,
      externalId: input.externalId ?? null,
      status: options.resetVerification ? "pending" : "verified",
      lastVerifiedAt: null,
      lastSyncAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    };
  };

  try {
    const updated = await awsAccountService.updateForUser("aws-1", "user-1", {
      name: "Prod",
      awsAccountId: "123456789012",
      roleArn: "arn:aws:iam::123456789012:role/Updated",
      externalId: null,
    });

    assert.equal(capturedResetVerification, true);
    assert.equal(updated.status, "pending");
    assert.equal(updated.externalId, null);
  } finally {
    awsAccountService.getForUser = originalGetForUser;
    awsAccountRepository.update = originalUpdate;
  }
});

test("updateForUser preserves verification when only the nickname changes", async () => {
  ensureTestEnv();

  const [{ awsAccountService }, { awsAccountRepository }] = await Promise.all([
    import("../services/aws-account.service.js"),
    import("../repositories/aws-account.repository.js"),
  ]);

  const originalGetForUser = awsAccountService.getForUser;
  const originalUpdate = awsAccountRepository.update;
  let capturedResetVerification: boolean | undefined;

  awsAccountService.getForUser = async () => ({
    id: "aws-1",
    workspaceId: "workspace-1",
    name: "Prod",
    awsAccountId: "123456789012",
    roleArn: "arn:aws:iam::123456789012:role/Original",
    externalId: null,
    status: "verified",
    lastVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
    lastSyncAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

  awsAccountRepository.update = async (_id, input, options) => {
    capturedResetVerification = options.resetVerification;
    return {
      id: "aws-1",
      workspaceId: "workspace-1",
      name: input.name,
      awsAccountId: input.awsAccountId,
      roleArn: input.roleArn,
      externalId: input.externalId ?? null,
      status: options.resetVerification ? "pending" : "verified",
      lastVerifiedAt: options.resetVerification ? null : new Date("2026-01-01T00:00:00.000Z"),
      lastSyncAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    };
  };

  try {
    const updated = await awsAccountService.updateForUser("aws-1", "user-1", {
      name: "Production Updated",
      awsAccountId: "123456789012",
      roleArn: "arn:aws:iam::123456789012:role/Original",
      externalId: null,
    });

    assert.equal(capturedResetVerification, false);
    assert.equal(updated.status, "verified");
  } finally {
    awsAccountService.getForUser = originalGetForUser;
    awsAccountRepository.update = originalUpdate;
  }
});

test("createForWorkspace derives the standard role ARN when one is not provided", async () => {
  ensureTestEnv();

  const [{ awsAccountService }, { awsAccountRepository }, { workspaceService }] = await Promise.all([
    import("../services/aws-account.service.js"),
    import("../repositories/aws-account.repository.js"),
    import("../services/workspace.service.js"),
  ]);

  const originalEnsureAccess = workspaceService.ensureUserHasAccess;
  const originalCreate = awsAccountRepository.create;
  let capturedRoleArn: string | undefined;

  workspaceService.ensureUserHasAccess = async () => {};
  awsAccountRepository.create = async (_workspaceId, input) => {
    capturedRoleArn = input.roleArn;
    return {
      id: "aws-1",
      workspaceId: "workspace-1",
      name: input.name,
      awsAccountId: input.awsAccountId,
      roleArn: input.roleArn,
      externalId: input.externalId ?? null,
      status: "pending",
      lastVerifiedAt: null,
      lastSyncAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
  };

  try {
    const created = await awsAccountService.createForWorkspace("workspace-1", "user-1", {
      name: "Prod",
      awsAccountId: "123456789012",
      externalId: "external-id",
    });

    assert.equal(
      capturedRoleArn,
      "arn:aws:iam::123456789012:role/UnderflowCostExplorerRead",
    );
    assert.equal(created.roleArn, "arn:aws:iam::123456789012:role/UnderflowCostExplorerRead");
  } finally {
    workspaceService.ensureUserHasAccess = originalEnsureAccess;
    awsAccountRepository.create = originalCreate;
  }
});
