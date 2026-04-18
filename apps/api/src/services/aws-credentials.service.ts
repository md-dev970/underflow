import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";

import { env } from "../config/env.js";
import type { AwsAccount } from "../types/aws-account.types.js";
import { AppError } from "../utils/app-error.js";
import { toAssumeRoleError } from "../utils/aws-account.js";

interface TemporarySessionCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export interface AssumedRoleSession {
  credentials: TemporarySessionCredentials;
  expiration: Date | null;
}

type AwsAction = "verify" | "sync";

export const awsCredentialsService = {
  buildBaseStsClient(): Pick<STSClient, "send"> {
    return new STSClient({ region: env.AWS_REGION });
  },

  buildSessionName(action: AwsAction): string {
    return `underflow-${action}`;
  },

  async assumeRole(account: AwsAccount, action: AwsAction): Promise<AssumedRoleSession> {
    try {
      const response = await this.buildBaseStsClient().send(
        new AssumeRoleCommand({
          RoleArn: account.roleArn,
          RoleSessionName: this.buildSessionName(action),
          ...(account.externalId ? { ExternalId: account.externalId } : {}),
        }),
      );

      const credentials = response.Credentials;

      if (
        !credentials?.AccessKeyId ||
        !credentials.SecretAccessKey ||
        !credentials.SessionToken
      ) {
        throw new AppError(
          "AWS STS did not return usable temporary credentials",
          502,
          undefined,
          "aws_assume_role_failed",
        );
      }

      return {
        credentials: {
          accessKeyId: credentials.AccessKeyId,
          secretAccessKey: credentials.SecretAccessKey,
          sessionToken: credentials.SessionToken,
        },
        expiration: credentials.Expiration ?? null,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw toAssumeRoleError(error, {
        awsAccountId: account.awsAccountId,
        roleArn: account.roleArn,
      });
    }
  },
};
