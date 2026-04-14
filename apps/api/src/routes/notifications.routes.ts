import { Router } from "express";

import { notificationController } from "../controllers/notification.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", authMiddleware, asyncHandler(notificationController.list));
