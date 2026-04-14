import type { CookieOptions, Response } from "express";

import { env } from "./env.js";
import type { AuthTokens } from "../types/auth.types.js";

export const ACCESS_TOKEN_COOKIE_NAME = "underflow_access_token";
export const REFRESH_TOKEN_COOKIE_NAME = "underflow_refresh_token";

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
  maxAge: 15 * 60 * 1000,
};

const refreshTokenCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000,
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
