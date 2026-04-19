import type { CookieOptions, Response } from "express";

import { env } from "./env.js";
import type { AuthTokens } from "../types/auth.types.js";

export const ACCESS_TOKEN_COOKIE_NAME = "underflow_access_token";
export const REFRESH_TOKEN_COOKIE_NAME = "underflow_refresh_token";

const durationPattern = /^(\d+)([smhd])$/i;

const parseDurationToMs = (value: string): number => {
  const normalized = value.trim();
  const match = durationPattern.exec(normalized);

  if (!match) {
    throw new Error(
      `Unsupported auth cookie duration format: "${value}". Use values like 30m, 12h, or 30d.`,
    );
  }

  const amount = Number.parseInt(match[1] ?? "0", 10);
  const unit = (match[2] ?? "").toLowerCase();

  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error(`Auth cookie duration must be a positive integer: "${value}"`);
  }

  const unitToMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const multiplier = unitToMs[unit];

  if (!multiplier) {
    throw new Error(`Unsupported auth cookie duration unit: "${value}"`);
  }

  return amount * multiplier;
};

const parseSameSite = (): CookieOptions["sameSite"] => {
  const configuredValue = process.env.AUTH_COOKIE_SAME_SITE;

  if (
    configuredValue === "strict" ||
    configuredValue === "lax" ||
    configuredValue === "none"
  ) {
    return configuredValue;
  }

  return "lax";
};

const cookieDomain = process.env.AUTH_COOKIE_DOMAIN;

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: parseSameSite(),
  secure: env.NODE_ENV === "production",
  path: "/",
};

if (cookieDomain) {
  baseCookieOptions.domain = cookieDomain;
}

const accessTokenCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: parseDurationToMs(env.JWT_ACCESS_EXPIRES_IN),
};

const refreshTokenCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN),
};

export const setAuthCookies = (res: Response, tokens: AuthTokens): void => {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, tokens.accessToken, accessTokenCookieOptions);
  res.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    tokens.refreshToken,
    refreshTokenCookieOptions,
  );
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, baseCookieOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, baseCookieOptions);
};
