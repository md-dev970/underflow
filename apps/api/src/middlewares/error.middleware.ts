import { invalidCsrfTokenError } from "../config/csrf.js";
import type { NextFunction, Request, Response } from "express";

import { logger } from "../lib/logger.js";
import { AppError } from "../utils/app-error.js";

export const errorMiddleware = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error === invalidCsrfTokenError) {
    res.status(403).json({
      message: "Invalid CSRF token",
      code: "invalid_csrf_token",
      details: null,
      requestId: req.requestId ?? null,
    });
    return;
  }

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error("Application error", {
        requestId: req.requestId,
        method: req.method,
        route: req.originalUrl,
        statusCode: error.statusCode,
        code: error.code,
        errorMessage: error.message,
      });
    }

    res.status(error.statusCode).json({
      message: error.message,
      code: error.code,
      details: error.details ?? null,
      requestId: req.requestId ?? null,
    });
    return;
  }

  if (error instanceof Error) {
    logger.error("Unhandled error", {
      requestId: req.requestId,
      method: req.method,
      route: req.originalUrl,
      statusCode: 500,
      errorMessage: error.message,
      stack: error.stack ?? null,
    });

    res.status(500).json({
      message: "Internal server error",
      code: "internal_error",
      details: null,
      requestId: req.requestId ?? null,
    });
    return;
  }

  res.status(500).json({
    message: "Internal server error",
    code: "internal_error",
    details: null,
    requestId: req.requestId ?? null,
  });
};
