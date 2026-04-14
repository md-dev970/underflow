import type { NextFunction, Request, Response } from "express";

import { logger } from "../lib/logger.js";

export const requestLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const startedAt = Date.now();

  res.on("finish", () => {
    logger.info("Request completed", {
      requestId: req.requestId,
      method: req.method,
      route: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      ipAddress: req.ip,
      userId: req.user?.id,
    });
  });

  next();
};
