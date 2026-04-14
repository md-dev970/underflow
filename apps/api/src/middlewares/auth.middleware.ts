import type { NextFunction, Request, Response } from "express";

import { ACCESS_TOKEN_COOKIE_NAME } from "../config/cookies.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { getSessionIdFromRefreshToken } from "../services/auth.service.js";
import { getRefreshTokenFromCookie } from "../utils/session.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/app-error.js";

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authenticate = async (token: string): Promise<void> => {
    const payload = verifyAccessToken(token);
    const user = await userRepository.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new AppError("Invalid or expired access token", 401);
    }

    if (payload.sessionVersion !== user.sessionVersion) {
      throw new AppError("Invalid or expired access token", 401);
    }

    const isCookieAuth =
      typeof req.cookies?.[ACCESS_TOKEN_COOKIE_NAME] === "string" &&
      req.cookies[ACCESS_TOKEN_COOKIE_NAME].length > 0;

    if (isCookieAuth) {
      const refreshToken = getRefreshTokenFromCookie(req);

      if (!refreshToken) {
        throw new AppError("Invalid or expired access token", 401);
      }

      const sessionId = getSessionIdFromRefreshToken(refreshToken);
      const refreshSession = await refreshTokenRepository.findActiveById(sessionId);

      if (!refreshSession || refreshSession.userId !== user.id) {
        throw new AppError("Invalid or expired access token", 401);
      }
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionVersion: payload.sessionVersion,
    };
  };

  const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];

  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    void authenticate(cookieToken)
      .then(() => next())
      .catch(() => next(new AppError("Invalid or expired access token", 401)));
    return;
  }

  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    next(new AppError("Authorization header is missing or invalid", 401));
    return;
  }

  const token = authorizationHeader.replace("Bearer ", "");

  void authenticate(token)
    .then(() => next())
    .catch(() => next(new AppError("Invalid or expired access token", 401)));
};
