import type { Request, Response } from "express";

import { workspaceService } from "../services/workspace.service.js";
import { AppError } from "../utils/app-error.js";
import { requireRouteParam } from "../utils/route-params.js";
import { validate } from "../utils/validation.js";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from "../validators/workspace.schemas.js";

export const workspaceController = {
  async create(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const input = validate(createWorkspaceSchema, req.body);
    const workspace = await workspaceService.create(req.user.id, input);

    res.status(201).json({ workspace });
  },

  async list(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const workspaces = await workspaceService.listForUser(req.user.id);

    res.status(200).json({ workspaces });
  },

  async get(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const workspaceId = requireRouteParam(req.params.id, "id");
    const workspace = await workspaceService.getForUser(workspaceId, req.user.id);

    res.status(200).json({ workspace });
  },

  async update(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const input = validate(updateWorkspaceSchema, req.body);
    const workspaceId = requireRouteParam(req.params.id, "id");
    const workspace = await workspaceService.updateForUser(
      workspaceId,
      req.user.id,
      input,
    );

    res.status(200).json({ workspace });
  },
};
