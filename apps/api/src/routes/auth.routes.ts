import { Router } from "express";

import { env } from "../config/env.js";
import { doubleCsrfProtection } from "../config/csrf.js";
import { authController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { createRateLimitMiddleware } from "../middlewares/rate-limit.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const authRouter = Router();

const authRateLimit = createRateLimitMiddleware({
  windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_AUTH_MAX_REQUESTS,
  keyBuilder: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase() : "";
    return `${req.ip}:${email}`;
  },
});

authRouter.get("/csrf-token", asyncHandler(authController.csrfToken));
authRouter.post(
  "/register",
  authRateLimit,
  doubleCsrfProtection,
  asyncHandler(authController.register),
);
authRouter.post("/mobile/register", authRateLimit, asyncHandler(authController.mobileRegister));
authRouter.post("/login", authRateLimit, doubleCsrfProtection, asyncHandler(authController.login));
authRouter.post("/mobile/login", authRateLimit, asyncHandler(authController.mobileLogin));
authRouter.post(
  "/refresh-token",
  authRateLimit,
  doubleCsrfProtection,
  asyncHandler(authController.refreshToken),
);
authRouter.post(
  "/mobile/refresh-token",
  authRateLimit,
  asyncHandler(authController.mobileRefreshToken),
);
authRouter.post("/logout", doubleCsrfProtection, asyncHandler(authController.logout));
authRouter.post(
  "/forgot-password",
  authRateLimit,
  asyncHandler(authController.forgotPassword),
);
authRouter.post(
  "/reset-password",
  authRateLimit,
  asyncHandler(authController.resetPassword),
);
authRouter.get("/me", authMiddleware, asyncHandler(authController.me));
