import type { Request, Response } from "express";

import { userService } from "../services/user.service.js";
import type { UpdateCurrentUserInput } from "../types/auth.types.js";
import { AppError } from "../utils/app-error.js";
import { requireRouteParam } from "../utils/route-params.js";
import { getCurrentSessionIdFromRequest } from "../utils/session.js";
import { validate } from "../utils/validation.js";
import {
  updateNotificationPreferencesSchema,
  updateCurrentUserSchema,
  updatePasswordSchema,
} from "../validators/user.schemas.js";

const toUpdateCurrentUserInput = (
  payload: ReturnType<typeof updateCurrentUserSchema.parse>,
): UpdateCurrentUserInput => {
  const input: UpdateCurrentUserInput = {};

  if (payload.firstName !== undefined) {
    input.firstName = payload.firstName;
  }

  if (payload.lastName !== undefined) {
    input.lastName = payload.lastName;
  }

  if (payload.phone !== undefined) {
    input.phone = payload.phone;
  }

  if (payload.avatarUrl !== undefined) {
    input.avatarUrl = payload.avatarUrl;
  }

  return input;
};

export const userController = {
  async updateMe(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const input = toUpdateCurrentUserInput(
      validate(updateCurrentUserSchema, req.body),
    );
    const user = await userService.updateCurrentUser(req.user.id, input);

    res.status(200).json({ user });
  },

  async updateMyPassword(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const input = validate(updatePasswordSchema, req.body);
    await userService.updatePassword(req.user.id, input);

    res.status(200).json({ message: "Password updated successfully" });
  },

  async getMyPreferences(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const preferences = await userService.getNotificationPreferences(req.user.id);
    res.status(200).json({ preferences });
  },

  async updateMyPreferences(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const preferences = await userService.updateNotificationPreferences(
      req.user.id,
      validate(updateNotificationPreferencesSchema, req.body),
    );

    res.status(200).json({ preferences });
  },

  async getMySessions(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const sessions = await userService.listSessions(
      req.user.id,
      getCurrentSessionIdFromRequest(req),
    );

    res.status(200).json({ sessions });
  },

  async revokeMySession(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const sessionId = requireRouteParam(req.params.sessionId, "sessionId");
    await userService.revokeSession(
      req.user.id,
      sessionId,
      getCurrentSessionIdFromRequest(req),
    );

    res.status(200).json({ message: "Session revoked successfully" });
  },

  async logoutOtherSessions(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    await userService.logoutOtherSessions(
      req.user.id,
      getCurrentSessionIdFromRequest(req),
    );

    res.status(200).json({ message: "Other sessions logged out successfully" });
  },
};
