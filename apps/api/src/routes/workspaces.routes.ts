import { Router } from "express";

import { env } from "../config/env.js";
import { workspaceController } from "../controllers/workspace.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { createRateLimitMiddleware } from "../middlewares/rate-limit.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const workspacesRouter = Router();

const mutationRateLimit = createRateLimitMiddleware({
  windowMs: env.RATE_LIMIT_MUTATION_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MUTATION_MAX_REQUESTS,
});

workspacesRouter.post("/", mutationRateLimit, authMiddleware, asyncHandler(workspaceController.create));
workspacesRouter.get("/", authMiddleware, asyncHandler(workspaceController.list));
workspacesRouter.get("/:id", authMiddleware, asyncHandler(workspaceController.get));
workspacesRouter.patch("/:id", mutationRateLimit, authMiddleware, asyncHandler(workspaceController.update));
workspacesRouter.delete("/:id", mutationRateLimit, authMiddleware, asyncHandler(workspaceController.remove));
