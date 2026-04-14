import { workspaceRepository } from "../repositories/workspace.repository.js";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  Workspace,
} from "../types/workspace.types.js";
import { AppError } from "../utils/app-error.js";

export const workspaceService = {
  async create(userId: string, input: CreateWorkspaceInput): Promise<Workspace> {
    return workspaceRepository.create(userId, input);
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
    return workspaceRepository.updateById(workspaceId, input);
  },

  async ensureUserHasAccess(workspaceId: string, userId: string): Promise<void> {
    const hasAccess = await workspaceRepository.userHasAccess(workspaceId, userId);

    if (!hasAccess) {
      throw new AppError("Workspace not found", 404);
    }
  },
};
