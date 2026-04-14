import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

export const billingEnabledMiddleware = (
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (!env.BILLING_ENABLED) {
    next(new AppError("Not found", 404));
    return;
  }

  next();
};
