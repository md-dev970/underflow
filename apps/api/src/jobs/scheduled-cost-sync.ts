import { connectToDatabase } from "../config/db.js";
import { logger } from "../lib/logger.js";
import { costService } from "../services/cost.service.js";
import type { ScheduledCostSyncSummary } from "../types/aws-account.types.js";

export const scheduledCostSyncDependencies = {
  connectToDatabase,
  syncAllVerifiedAccounts: async (): Promise<ScheduledCostSyncSummary> =>
    costService.syncAllVerifiedAccounts(),
};

export const runScheduledCostSync = async (): Promise<ScheduledCostSyncSummary> => {
  const startedAt = Date.now();
  logger.info("Scheduled cost sync Lambda started");

  await scheduledCostSyncDependencies.connectToDatabase();

  try {
    const result = await scheduledCostSyncDependencies.syncAllVerifiedAccounts();
    logger.info("Scheduled cost sync Lambda completed", {
      durationMs: Date.now() - startedAt,
      scannedAccounts: result.scannedAccounts,
      syncedAccounts: result.syncedAccounts,
      skippedAccounts: result.skippedAccounts,
      failedAccounts: result.failedAccounts,
    });
    return result;
  } catch (error) {
    logger.error("Scheduled cost sync Lambda failed", {
      durationMs: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message : "Unknown sync error",
    });
    throw error;
  }
};
