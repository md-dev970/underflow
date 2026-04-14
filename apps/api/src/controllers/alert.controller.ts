import type { Request, Response } from "express";

import { alertService } from "../services/alert.service.js";
import { AppError } from "../utils/app-error.js";
import { requireRouteParam } from "../utils/route-params.js";
import { validate } from "../utils/validation.js";
import {
  createBudgetAlertSchema,
  updateBudgetAlertSchema,
} from "../validators/alert.schemas.js";

export const alertController = {
  async create(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const input = validate(createBudgetAlertSchema, req.body);
    const workspaceId = requireRouteParam(req.params.workspaceId, "workspaceId");
    const alert = await alertService.createForWorkspace(
      workspaceId,
      req.user.id,
      input,
    );

    res.status(201).json({ alert });
  },

  async list(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const workspaceId = requireRouteParam(req.params.workspaceId, "workspaceId");
    const alerts = await alertService.listForWorkspace(workspaceId, req.user.id);

    res.status(200).json({ alerts });
  },

  async update(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const input = validate(updateBudgetAlertSchema, req.body);
    const alertId = requireRouteParam(req.params.id, "id");
    const alert = await alertService.updateForUser(alertId, req.user.id, input);

    res.status(200).json({ alert });
  },

  async remove(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const alertId = requireRouteParam(req.params.id, "id");
    await alertService.deleteForUser(alertId, req.user.id);

    res.status(204).send();
  },
};
