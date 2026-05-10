import { runScheduledCostSync } from "./scheduled-cost-sync.js";

export const handler = async (): Promise<{
  statusCode: number;
  body: string;
}> => {
  const result = await runScheduledCostSync();

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
};
