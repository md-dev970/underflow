import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { awsAccountRepository } from "../repositories/aws-account.repository.js";
import { costRepository } from "../repositories/cost.repository.js";
import { jobLockRepository } from "../repositories/job-lock.repository.js";
import type {
  CostQueryInput,
  CostSummary,
  CostSyncResult,
  ServiceCostBreakdownItem,
  SyncHistoryItem,
  SyncHistoryQueryInput,
  TimeseriesCostPoint,
} from "../types/aws-account.types.js";
import { AppError } from "../utils/app-error.js";
import { costExplorerService } from "./cost-explorer.service.js";
import { workspaceService } from "./workspace.service.js";

const defaultDateRange = (): { from: string; to: string } => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - env.COST_SYNC_LOOKBACK_DAYS);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
};

export const costService = {
  async syncAwsAccountForUser(
    awsAccountId: string,
    userId: string,
    range?: { from?: string | undefined; to?: string | undefined },
  ): Promise<CostSyncResult> {
    const awsAccount = await awsAccountRepository.findById(awsAccountId);

    if (!awsAccount) {
      throw new AppError("AWS account not found", 404);
    }

    await workspaceService.ensureUserHasAccess(awsAccount.workspaceId, userId);

    const syncRange =
      range?.from && range?.to ? { from: range.from, to: range.to } : defaultDateRange();

    logger.info("Manual AWS sync requested", {
      awsAccountId: awsAccount.id,
      workspaceId: awsAccount.workspaceId,
      requestedByUserId: userId,
      from: syncRange.from,
      to: syncRange.to,
    });

    const lock = await jobLockRepository.withAdvisoryLock(
      `aws-sync:${awsAccount.id}`,
      async () => {
        const syncRunId = await costRepository.createSyncRun(awsAccountId);

        try {
          const entries = await costExplorerService.fetchCostData(
            awsAccount,
            syncRange.from,
            syncRange.to,
          );
          const recordsSynced = await costRepository.replaceSnapshots({
            workspaceId: awsAccount.workspaceId,
            awsAccountId: awsAccount.id,
            entries,
          });

          await awsAccountRepository.updateLastSyncAt(awsAccount.id);
          await costRepository.completeSyncRun(syncRunId, "completed");
          logger.info("AWS sync completed", {
            awsAccountId: awsAccount.id,
            workspaceId: awsAccount.workspaceId,
            syncRunId,
            recordsSynced,
          });

          return { syncRunId, recordsSynced };
        } catch (error) {
          await costRepository.completeSyncRun(
            syncRunId,
            "failed",
            error instanceof Error ? error.message : "Unknown sync error",
          );
          logger.error("AWS sync failed", {
            awsAccountId: awsAccount.id,
            workspaceId: awsAccount.workspaceId,
            errorMessage: error instanceof Error ? error.message : "Unknown sync error",
          });
          throw error;
        }
      },
    );

    if (!lock.acquired || !lock.result) {
      throw new AppError("A sync is already in progress for this AWS account", 409, null, "sync_in_progress");
    }

    return lock.result;
  },

  async getSummaryForWorkspace(
    workspaceId: string,
    userId: string,
    input: CostQueryInput,
  ): Promise<CostSummary> {
    await workspaceService.ensureUserHasAccess(workspaceId, userId);
    return costRepository.getSummary(workspaceId, input);
  },

  async getByServiceForWorkspace(
    workspaceId: string,
    userId: string,
    input: CostQueryInput,
  ): Promise<ServiceCostBreakdownItem[]> {
    await workspaceService.ensureUserHasAccess(workspaceId, userId);
    return costRepository.getByService(workspaceId, input);
  },

  async getTimeseriesForWorkspace(
    workspaceId: string,
    userId: string,
    input: CostQueryInput,
  ): Promise<TimeseriesCostPoint[]> {
    await workspaceService.ensureUserHasAccess(workspaceId, userId);
    return costRepository.getTimeseries(workspaceId, input);
  },

  async getSyncHistoryForWorkspace(
    workspaceId: string,
    userId: string,
    input: SyncHistoryQueryInput,
  ): Promise<SyncHistoryItem[]> {
    await workspaceService.ensureUserHasAccess(workspaceId, userId);
    return costRepository.getSyncHistory(workspaceId, input);
  },

  async syncAllVerifiedAccounts(): Promise<void> {
    const accounts = await awsAccountRepository.findActiveForSync();

    for (const account of accounts) {
      const lock = await jobLockRepository.withAdvisoryLock(
        `aws-sync:${account.id}`,
        async () => {
          const syncRunId = await costRepository.createSyncRun(account.id);

          try {
            const range = defaultDateRange();
            const entries = await costExplorerService.fetchCostData(
              account,
              range.from,
              range.to,
            );

            await costRepository.replaceSnapshots({
              workspaceId: account.workspaceId,
              awsAccountId: account.id,
              entries,
            });

            await awsAccountRepository.updateLastSyncAt(account.id);
            await costRepository.completeSyncRun(syncRunId, "completed");
          } catch (error) {
            await costRepository.completeSyncRun(
              syncRunId,
              "failed",
              error instanceof Error ? error.message : "Unknown sync error",
            );
            throw error;
          }
        },
      );

      if (!lock.acquired) {
        logger.info("Skipped AWS account sync because another run is active", {
          awsAccountId: account.id,
          workspaceId: account.workspaceId,
        });
        continue;
      }

      try {
        await lock.result;
      } catch (error) {
        logger.error("Background AWS sync failed", {
          awsAccountId: account.id,
          workspaceId: account.workspaceId,
          errorMessage: error instanceof Error ? error.message : "Unknown sync error",
        });
      }
    }
  },
};
