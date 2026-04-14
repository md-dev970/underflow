import { alertRepository } from "../repositories/alert.repository.js";
import { costRepository } from "../repositories/cost.repository.js";
import { logger } from "../lib/logger.js";
import type {
  BudgetAlert,
  CreateBudgetAlertInput,
  UpdateBudgetAlertInput,
} from "../types/alert.types.js";
import { AppError } from "../utils/app-error.js";
import { notificationService } from "./notification.service.js";
import { workspaceService } from "./workspace.service.js";

const currentMonthRange = (): { from: string; to: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
};

export const alertService = {
  async createForWorkspace(
    workspaceId: string,
    userId: string,
    input: CreateBudgetAlertInput,
  ): Promise<BudgetAlert> {
    await workspaceService.ensureUserHasAccess(workspaceId, userId);
    return alertRepository.create(workspaceId, input);
  },

  async listForWorkspace(workspaceId: string, userId: string): Promise<BudgetAlert[]> {
    await workspaceService.ensureUserHasAccess(workspaceId, userId);
    return alertRepository.findManyByWorkspaceId(workspaceId);
  },

  async updateForUser(
    alertId: string,
    userId: string,
    input: UpdateBudgetAlertInput,
  ): Promise<BudgetAlert> {
    const alert = await alertRepository.findById(alertId);

    if (!alert) {
      throw new AppError("Alert not found", 404);
    }

    await workspaceService.ensureUserHasAccess(alert.workspaceId, userId);
    return alertRepository.updateById(alertId, input);
  },

  async deleteForUser(alertId: string, userId: string): Promise<void> {
    const alert = await alertRepository.findById(alertId);

    if (!alert) {
      throw new AppError("Alert not found", 404);
    }

    await workspaceService.ensureUserHasAccess(alert.workspaceId, userId);
    await alertRepository.deleteById(alertId);
  },

  async evaluateActiveAlerts(): Promise<void> {
    const alerts = await alertRepository.findActive();

    for (const alert of alerts) {
      try {
        const range = currentMonthRange();
        const summary = await costRepository.getSummary(alert.workspaceId, {
          from: range.from,
          to: range.to,
          awsAccountId: alert.awsAccountId ?? undefined,
        });

        if (summary.totalAmount < alert.thresholdAmount) {
          continue;
        }

        const event = await alertRepository.createAlertEvent({
          alertId: alert.id,
          workspaceId: alert.workspaceId,
          awsAccountId: alert.awsAccountId,
          observedAmount: summary.totalAmount,
          currency: summary.currency,
          eventKey: `${alert.id}:${range.from}:${range.to}:${alert.awsAccountId ?? "workspace"}`,
        });

        if (!event.id) {
          logger.info("Skipped duplicate alert event", {
            alertId: alert.id,
            workspaceId: alert.workspaceId,
            awsAccountId: alert.awsAccountId,
          });
          continue;
        }

        await notificationService.sendAlertEmail({
          alertEventId: event.id,
          recipient: alert.recipientEmail,
          subject: `Budget alert: ${alert.name}`,
          body: `Your spend reached ${summary.totalAmount.toFixed(2)} ${summary.currency}.`,
        });
      } catch (error) {
        logger.error("Alert evaluation failed", {
          alertId: alert.id,
          workspaceId: alert.workspaceId,
          awsAccountId: alert.awsAccountId,
          errorMessage: error instanceof Error ? error.message : "Unknown alert error",
        });
      }
    }
  },
};
