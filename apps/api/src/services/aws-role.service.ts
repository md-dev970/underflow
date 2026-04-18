import {
  GetCallerIdentityCommand,
  STSClient,
} from "@aws-sdk/client-sts";

import { env } from "../config/env.js";
import type { AwsAccount } from "../types/aws-account.types.js";
import { AppError } from "../utils/app-error.js";
import { awsCredentialsService, type AssumedRoleSession } from "./aws-credentials.service.js";

export const awsRoleService = {
  buildStsClient(credentials: AssumedRoleSession["credentials"]): Pick<STSClient, "send"> {
    return new STSClient({ region: env.AWS_REGION, credentials });
  },

  async verifyConnection(account: AwsAccount): Promise<void> {
    const session = await awsCredentialsService.assumeRole(account, "verify");

    try {
      const identity = await this.buildStsClient(session.credentials).send(
        new GetCallerIdentityCommand({}),
      );

      if (identity.Account !== account.awsAccountId) {
        throw new AppError(
          "The assumed role resolved to a different AWS account than the one you entered",
          400,
          { expectedAccountId: account.awsAccountId, resolvedAccountId: identity.Account },
          "aws_account_mismatch",
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        "Unable to verify the AWS role configuration",
        400,
        { awsAccountId: account.awsAccountId, roleArn: account.roleArn, cause: error instanceof Error ? error.message : "Unknown AWS error" },
        "aws_verification_failed",
      );
    }
  },
};
