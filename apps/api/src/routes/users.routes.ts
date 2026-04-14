import { Router } from "express";

import { userController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const usersRouter = Router();

usersRouter.patch("/me", authMiddleware, asyncHandler(userController.updateMe));
usersRouter.patch(
  "/me/password",
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
  authMiddleware,
  asyncHandler(userController.revokeMySession),
);
usersRouter.post(
  "/me/sessions/logout-others",
  authMiddleware,
  asyncHandler(userController.logoutOtherSessions),
);
