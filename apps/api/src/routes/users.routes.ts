import { Router } from "express";

import { env } from "../config/env.js";
import { userController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { createRateLimitMiddleware } from "../middlewares/rate-limit.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const usersRouter = Router();

const mutationRateLimit = createRateLimitMiddleware({
  windowMs: env.RATE_LIMIT_MUTATION_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MUTATION_MAX_REQUESTS,
});

usersRouter.patch("/me", mutationRateLimit, authMiddleware, asyncHandler(userController.updateMe));
usersRouter.patch(
  "/me/password",
  mutationRateLimit,
  authMiddleware,
  asyncHandler(userController.updateMyPassword),
);
usersRouter.get(
  "/me/preferences",
  authMiddleware,
  asyncHandler(userController.getMyPreferences),
);
usersRouter.patch(
  "/me/preferences",
  mutationRateLimit,
  authMiddleware,
  asyncHandler(userController.updateMyPreferences),
);
usersRouter.get(
  "/me/sessions",
  authMiddleware,
  asyncHandler(userController.getMySessions),
);
usersRouter.delete(
  "/me/sessions/:sessionId",
  mutationRateLimit,
  authMiddleware,
  asyncHandler(userController.revokeMySession),
);
usersRouter.post(
  "/me/sessions/logout-others",
  mutationRateLimit,
  authMiddleware,
  asyncHandler(userController.logoutOtherSessions),
);
usersRouter.post(
  "/me/request-account-deletion",
  mutationRateLimit,
  authMiddleware,
  asyncHandler(userController.requestMyAccountDeletion),
);
