import { workspaceRepository } from "../repositories/workspace.repository.js";
import { logger } from "../lib/logger.js";
import type {
  CreateWorkspaceInput,
  DeletedWorkspaceResult,
  UpdateWorkspaceInput,
  Workspace,
} from "../types/workspace.types.js";
import { AppError } from "../utils/app-error.js";

export const workspaceService = {
  async create(userId: string, input: CreateWorkspaceInput): Promise<Workspace> {
    const workspace = await workspaceRepository.create(userId, input);
    logger.info("Workspace created", {
      userId,
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
    });
    return workspace;
  },

  async listForUser(userId: string): Promise<Workspace[]> {
    return workspaceRepository.findManyForUser(userId);
  },

  async getForUser(workspaceId: string, userId: string): Promise<Workspace> {
    const hasAccess = await workspaceRepository.userHasAccess(workspaceId, userId);

    if (!hasAccess) {
      throw new AppError("Workspace not found", 404);
    }

    const workspace = await workspaceRepository.findById(workspaceId);

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    return workspace;
  },

  async updateForUser(
    workspaceId: string,
    userId: string,
    input: UpdateWorkspaceInput,
  ): Promise<Workspace> {
    await this.getForUser(workspaceId, userId);
    const workspace = await workspaceRepository.updateById(workspaceId, input);
    logger.info("Workspace updated", {
      userId,
      workspaceId,
      workspaceSlug: workspace.slug,
    });
    return workspace;
  },

  async deleteForUser(workspaceId: string, userId: string): Promise<DeletedWorkspaceResult> {
    const workspace = await this.getForUser(workspaceId, userId);

    if (workspace.ownerUserId !== userId) {
      throw new AppError("Only the workspace owner can delete this workspace", 403);
    }

    const impact = await workspaceRepository.getDeletionImpact(workspaceId);
    await workspaceRepository.deleteById(workspaceId);
    logger.info("Workspace deleted", {
      userId,
      workspaceId,
      deletedAwsAccountCount: impact.deletedAwsAccountCount,
      deletedAlertCount: impact.deletedAlertCount,
      deletedSnapshotCount: impact.deletedSnapshotCount,
      deletedSyncRunCount: impact.deletedSyncRunCount,
      deletedNotificationCount: impact.deletedNotificationCount,
    });

    return {
      id: workspaceId,
      ...impact,
    };
  },

  async ensureUserHasAccess(workspaceId: string, userId: string): Promise<void> {
    const hasAccess = await workspaceRepository.userHasAccess(workspaceId, userId);

    if (!hasAccess) {
      throw new AppError("Workspace not found", 404);
    }
  },
};
