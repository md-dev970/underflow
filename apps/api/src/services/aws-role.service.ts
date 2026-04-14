import {
  GetCallerIdentityCommand,
  STSClient,
} from "@aws-sdk/client-sts";

import { env } from "../config/env.js";
import type { AwsAccount } from "../types/aws-account.types.js";

export const awsRoleService = {
  async verifyConnection(_account: AwsAccount): Promise<void> {
    const client = new STSClient({ region: env.AWS_REGION });
    await client.send(new GetCallerIdentityCommand({}));
  },
};
