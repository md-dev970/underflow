import { awsAccountRepository } from "../repositories/aws-account.repository.js";
import { AppError } from "../utils/app-error.js";
import type {
  AwsAccount,
  CreateAwsAccountInput,
} from "../types/aws-account.types.js";
import { awsRoleService } from "./aws-role.service.js";
import { workspaceService } from "./workspace.service.js";

export const awsAccountService = {
  async createForWorkspace(
    workspaceId: string,
    userId: string,
    input: CreateAwsAccountInput,
  ): Promise<AwsAccount> {
    await workspaceService.ensureUserHasAccess(workspaceId, userId);
    return awsAccountRepository.create(workspaceId, input);
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
    await awsRoleService.verifyConnection(awsAccount);
    await awsAccountRepository.updateVerificationStatus(awsAccount.id, "verified");
    return (await awsAccountRepository.findById(awsAccount.id)) as AwsAccount;
  },
};
