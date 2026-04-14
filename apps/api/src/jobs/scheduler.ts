import cron from "node-cron";

import { logger } from "../lib/logger.js";
import { jobLockRepository } from "../repositories/job-lock.repository.js";
import { alertService } from "../services/alert.service.js";
import { costService } from "../services/cost.service.js";

const runScheduledJob = async (
  jobName: string,
  callback: () => Promise<void>,
): Promise<void> => {
  const startedAt = Date.now();
  const lock = await jobLockRepository.withAdvisoryLock(`scheduler:${jobName}`, callback);

  if (!lock.acquired) {
    logger.info("Scheduled job skipped because lock is already held", { jobName });
    return;
  }

  logger.info("Scheduled job completed", {
    jobName,
    durationMs: Date.now() - startedAt,
  });
};

export const startJobScheduler = (): void => {
  cron.schedule("0 2 * * *", () => {
    void runScheduledJob("sync_all_verified_accounts", () =>
      costService.syncAllVerifiedAccounts(),
    ).catch((error: unknown) => {
      logger.error("Scheduled job failed", {
        jobName: "sync_all_verified_accounts",
        errorMessage: error instanceof Error ? error.message : "Unknown job error",
      });
    });
  });

  cron.schedule("0 * * * *", () => {
    void runScheduledJob("evaluate_active_alerts", () =>
      alertService.evaluateActiveAlerts(),
    ).catch((error: unknown) => {
      logger.error("Scheduled job failed", {
        jobName: "evaluate_active_alerts",
        errorMessage: error instanceof Error ? error.message : "Unknown job error",
      });
    });
  });
};
