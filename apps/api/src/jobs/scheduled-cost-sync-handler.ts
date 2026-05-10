export const handler = async (): Promise<{
  statusCode: number;
  body: string;
}> => {
  try {
    const { runScheduledCostSync } = await import("./scheduled-cost-sync.js");
    const result = await runScheduledCostSync();

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Scheduled cost sync Lambda bootstrap failed", error);
    throw error;
  }
};

