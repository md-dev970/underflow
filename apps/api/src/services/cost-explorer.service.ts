import {
  type GetCostAndUsageCommandOutput,
  type Group,
  CostExplorerClient,
  GetCostAndUsageCommand,
} from "@aws-sdk/client-cost-explorer";

import { env } from "../config/env.js";
import type { AwsAccount } from "../types/aws-account.types.js";

export interface CostExplorerEntry {
  usageDate: string;
  serviceName: string;
  amount: number;
  currency: string;
}

export const costExplorerService = {
  async fetchCostData(
    _account: AwsAccount,
    from: string,
    to: string,
  ): Promise<CostExplorerEntry[]> {
    const client = new CostExplorerClient({ region: env.AWS_REGION });

    const response = await client.send(
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
