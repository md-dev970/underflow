import type { Request } from "express";

import { REFRESH_TOKEN_COOKIE_NAME } from "../config/cookies.js";
import type { SessionMetadata } from "../types/auth.types.js";
import { getSessionIdFromRefreshToken } from "../services/auth.service.js";

export const getRefreshTokenFromCookie = (req: Request): string | undefined => {
  const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  return typeof token === "string" && token.length > 0 ? token : undefined;
};

const getIpAddress = (req: Request): string | null => {
  const forwardedHeader = req.headers["x-forwarded-for"];

  if (typeof forwardedHeader === "string" && forwardedHeader.length > 0) {
    return forwardedHeader.split(",")[0]?.trim() ?? null;
  }

  return req.ip ?? null;
};

export const getSessionMetadataFromRequest = (req: Request): SessionMetadata => ({
  userAgent:
    typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
  ipAddress: getIpAddress(req),
});

export const getCurrentSessionIdFromRequest = (req: Request): string | null => {
  const refreshToken = getRefreshTokenFromCookie(req);

  if (!refreshToken) {
    return null;
  }

  try {
    return getSessionIdFromRefreshToken(refreshToken);
  } catch {
    return null;
  }
};
