import {
  type GetCostAndUsageCommandOutput,
  type Group,
  CostExplorerClient,
  GetCostAndUsageCommand,
} from "@aws-sdk/client-cost-explorer";

import { env } from "../config/env.js";
import type { AwsAccount } from "../types/aws-account.types.js";
import { toCostExplorerError } from "../utils/aws-account.js";
import { awsCredentialsService, type AssumedRoleSession } from "./aws-credentials.service.js";

export interface CostExplorerEntry {
  usageDate: string;
  serviceName: string;
  amount: number;
  currency: string;
}

export const costExplorerService = {
  buildCostExplorerClient(
    credentials: AssumedRoleSession["credentials"],
  ): Pick<CostExplorerClient, "send"> {
    return new CostExplorerClient({ region: env.AWS_REGION, credentials });
  },

  async fetchCostData(
    account: AwsAccount,
    from: string,
    to: string,
  ): Promise<CostExplorerEntry[]> {
    const session = await awsCredentialsService.assumeRole(account, "sync");

    let response: GetCostAndUsageCommandOutput;

    try {
      response = await this.buildCostExplorerClient(session.credentials).send(
        new GetCostAndUsageCommand({
          TimePeriod: {
            Start: from,
            End: to,
          },
          Granularity: "DAILY",
          Metrics: ["UnblendedCost"],
          GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
        }),
      );
    } catch (error) {
      throw toCostExplorerError(error, {
        awsAccountId: account.awsAccountId,
        roleArn: account.roleArn,
      });
    }

    return (
      response.ResultsByTime?.flatMap(
        (timeSlice: NonNullable<GetCostAndUsageCommandOutput["ResultsByTime"]>[number]) =>
          (timeSlice.Groups ?? []).map((group: Group) => ({
          usageDate: timeSlice.TimePeriod?.Start ?? from,
          serviceName: group.Keys?.[0] ?? "Unknown",
          amount: Number(group.Metrics?.UnblendedCost?.Amount ?? "0"),
          currency: group.Metrics?.UnblendedCost?.Unit ?? "USD",
        })),
      ) ?? []
    );
  },
};
