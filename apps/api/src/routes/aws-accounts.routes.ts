import { Router } from "express";

import { env } from "../config/env.js";
import { alertController } from "../controllers/alert.controller.js";
import { awsAccountController } from "../controllers/aws-account.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { createRateLimitMiddleware } from "../middlewares/rate-limit.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const awsAccountsRouter = Router();

const mutationRateLimit = createRateLimitMiddleware({
  windowMs: env.RATE_LIMIT_MUTATION_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MUTATION_MAX_REQUESTS,
});

awsAccountsRouter.post(
  "/workspaces/:workspaceId/aws-accounts",
  mutationRateLimit,
  authMiddleware,
  asyncHandler(awsAccountController.create),
);
awsAccountsRouter.get(
  "/workspaces/:workspaceId/aws-accounts",
  authMiddleware,
  asyncHandler(awsAccountController.list),
);
awsAccountsRouter.post(
  "/aws-accounts/:id/verify",
  mutationRateLimit,
  authMiddleware,
  asyncHandler(awsAccountController.verify),
);
awsAccountsRouter.post(
  "/aws-accounts/:id/sync",
  mutationRateLimit,
  authMiddleware,
  asyncHandler(awsAccountController.sync),
);
awsAccountsRouter.get(
  "/workspaces/:workspaceId/costs/summary",
  authMiddleware,
  asyncHandler(awsAccountController.summary),
);
awsAccountsRouter.get(
  "/workspaces/:workspaceId/costs/by-service",
  authMiddleware,
  asyncHandler(awsAccountController.byService),
);
awsAccountsRouter.get(
  "/workspaces/:workspaceId/costs/timeseries",
  authMiddleware,
  asyncHandler(awsAccountController.timeseries),
);
awsAccountsRouter.get(
  "/workspaces/:workspaceId/sync-history",
  authMiddleware,
  asyncHandler(awsAccountController.syncHistory),
);
awsAccountsRouter.post(
  "/workspaces/:workspaceId/alerts",
  mutationRateLimit,
  authMiddleware,
  asyncHandler(alertController.create),
);
awsAccountsRouter.get(
  "/workspaces/:workspaceId/alerts",
  authMiddleware,
  asyncHandler(alertController.list),
);
awsAccountsRouter.patch(
  "/alerts/:id",
  mutationRateLimit,
  authMiddleware,
  asyncHandler(alertController.update),
);
awsAccountsRouter.delete(
  "/alerts/:id",
  mutationRateLimit,
  authMiddleware,
  asyncHandler(alertController.remove),
);
