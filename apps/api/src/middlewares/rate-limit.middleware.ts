import type { NextFunction, Request, Response } from "express";

import { AppError } from "../utils/app-error.js";

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  keyBuilder?: (req: Request) => string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

const defaultKeyBuilder = (req: Request): string => req.ip || "unknown";

export const clearRateLimitState = (): void => {
  buckets.clear();
};

export const createRateLimitMiddleware = (options: RateLimitOptions) => {
  const keyBuilder = options.keyBuilder ?? defaultKeyBuilder;

  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = `${req.baseUrl}${req.path}:${keyBuilder(req)}`;
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      next();
      return;
    }

    if (current.count >= options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      next(
        new AppError("Too many requests", 429, { retryAfterSeconds }, "rate_limited"),
      );
      return;
    }

    current.count += 1;
    buckets.set(key, current);
    next();
  };
};
