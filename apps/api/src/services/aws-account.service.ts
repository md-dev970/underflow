import { awsAccountRepository } from "../repositories/aws-account.repository.js";
import { logger } from "../lib/logger.js";
import { AppError } from "../utils/app-error.js";
import type {
  AwsAccount,
  CreateAwsAccountInput,
  DeletedAwsAccountResult,
  UpdateAwsAccountInput,
} from "../types/aws-account.types.js";
import { buildStandardRoleArn } from "../utils/aws-account.js";
import { awsRoleService } from "./aws-role.service.js";
import { workspaceService } from "./workspace.service.js";

export const awsAccountService = {
  async createForWorkspace(
    workspaceId: string,
    userId: string,
    input: CreateAwsAccountInput,
  ): Promise<AwsAccount> {
    await workspaceService.ensureUserHasAccess(workspaceId, userId);
    const awsAccount = await awsAccountRepository.create(workspaceId, {
      ...input,
      roleArn: input.roleArn ?? buildStandardRoleArn(input.awsAccountId),
    });
    logger.info("AWS account created", {
      userId,
      workspaceId,
      awsAccountId: awsAccount.id,
      linkedAccountId: awsAccount.awsAccountId,
      roleArn: awsAccount.roleArn,
    });
    return awsAccount;
  },

  async listForWorkspace(workspaceId: string, userId: string): Promise<AwsAccount[]> {
    await workspaceService.ensureUserHasAccess(workspaceId, userId);
    return awsAccountRepository.findManyByWorkspaceId(workspaceId);
  },

  async getForUser(awsAccountId: string, userId: string): Promise<AwsAccount> {
    const awsAccount = await awsAccountRepository.findById(awsAccountId);

    if (!awsAccount) {
      throw new AppError("AWS account not found", 404);
    }

    await workspaceService.ensureUserHasAccess(awsAccount.workspaceId, userId);
    return awsAccount;
  },

  async verifyForUser(awsAccountId: string, userId: string): Promise<AwsAccount> {
    const awsAccount = await this.getForUser(awsAccountId, userId);
    try {
      await awsRoleService.verifyConnection(awsAccount);
    } catch (error) {
      logger.warn("AWS account verification failed", {
        userId,
        workspaceId: awsAccount.workspaceId,
        awsAccountId: awsAccount.id,
        linkedAccountId: awsAccount.awsAccountId,
        errorMessage: error instanceof Error ? error.message : "Unknown verification error",
      });
      throw error;
    }
    await awsAccountRepository.updateVerificationStatus(awsAccount.id, "verified");
    const verifiedAccount = (await awsAccountRepository.findById(awsAccount.id)) as AwsAccount;
    logger.info("AWS account verified", {
      userId,
      workspaceId: verifiedAccount.workspaceId,
      awsAccountId: verifiedAccount.id,
      linkedAccountId: verifiedAccount.awsAccountId,
    });
    return verifiedAccount;
  },

  async updateForUser(
    awsAccountId: string,
    userId: string,
    input: UpdateAwsAccountInput,
  ): Promise<AwsAccount> {
    const awsAccount = await this.getForUser(awsAccountId, userId);
    const roleArn = input.roleArn ?? buildStandardRoleArn(input.awsAccountId);
    const normalizedExternalId = input.externalId ?? null;
    const resetVerification =
      awsAccount.awsAccountId !== input.awsAccountId ||
      awsAccount.roleArn !== roleArn ||
      (awsAccount.externalId ?? null) !== normalizedExternalId;

    const updatedAccount = await awsAccountRepository.update(
      awsAccount.id,
      {
        ...input,
        roleArn,
        externalId: normalizedExternalId,
      },
      { resetVerification },
    );
    logger.info("AWS account updated", {
      userId,
      workspaceId: updatedAccount.workspaceId,
      awsAccountId: updatedAccount.id,
      linkedAccountId: updatedAccount.awsAccountId,
      resetVerification,
    });
    return updatedAccount;
  },

  async deleteForUser(awsAccountId: string, userId: string): Promise<DeletedAwsAccountResult> {
    const awsAccount = await this.getForUser(awsAccountId, userId);
    const impact = await awsAccountRepository.getDeletionImpact(awsAccount.id);
    await awsAccountRepository.deleteById(awsAccount.id);
    logger.info("AWS account deleted", {
      userId,
      workspaceId: awsAccount.workspaceId,
      awsAccountId: awsAccount.id,
      linkedAccountId: awsAccount.awsAccountId,
      deletedAlertCount: impact.deletedAlertCount,
      deletedSyncRunCount: impact.deletedSyncRunCount,
      deletedSnapshotCount: impact.deletedSnapshotCount,
    });

    return {
      id: awsAccount.id,
      workspaceId: awsAccount.workspaceId,
      ...impact,
    };
  },
};
