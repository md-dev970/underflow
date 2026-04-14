import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const REQUEST_ID_HEADER = "x-request-id";

export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const headerValue = req.header(REQUEST_ID_HEADER);
  const requestId =
    typeof headerValue === "string" && headerValue.trim().length > 0
      ? headerValue.trim()
      : randomUUID();

  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
};
