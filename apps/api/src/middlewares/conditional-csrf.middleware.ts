import type { NextFunction, Request, Response } from "express";

import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from "../config/cookies.js";
import { doubleCsrfProtection } from "../config/csrf.js";

export const conditionalCsrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const hasAuthCookies =
    typeof req.cookies?.[ACCESS_TOKEN_COOKIE_NAME] === "string" ||
    typeof req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] === "string";

  if (!hasAuthCookies) {
    next();
    return;
  }

  doubleCsrfProtection(req, res, next);
};
