import type { Request, Response } from "express";

import { notificationService } from "../services/notification.service.js";
import { AppError } from "../utils/app-error.js";
import { validate } from "../utils/validation.js";
import { notificationQuerySchema } from "../validators/notification.schemas.js";

export const notificationController = {
  async list(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const input = validate(notificationQuerySchema, req.query);
    const notifications = await notificationService.getFeedForUser({
      userId: req.user.id,
      workspaceId: input.workspaceId,
      status: input.status,
      limit: input.limit,
    });

    res.status(200).json({ notifications });
  },
};
