import type { Request, Response } from "express";

export const notFoundMiddleware = (_req: Request, res: Response): void => {
  res.status(404).json({
    message: "Route not found",
    code: "route_not_found",
    details: null,
    requestId: _req.requestId ?? null,
  });
};
