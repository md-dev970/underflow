import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

import {
  ACCESS_TOKEN_AUDIENCE,
  REFRESH_TOKEN_AUDIENCE,
} from "../constants/auth.constants.js";
import { env } from "../config/env.js";
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  RefreshTokenPayload,
} from "../types/auth.types.js";

const createSignOptions = (
  audience: string,
  expiresIn: string,
): SignOptions => ({
  audience,
  expiresIn: expiresIn as NonNullable<SignOptions["expiresIn"]>,
  issuer: "underflow-api",
});

export const signAccessToken = (user: AuthenticatedUser): string =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion ?? 1,
      type: "access",
    } satisfies AccessTokenPayload,
    env.JWT_ACCESS_SECRET,
    createSignOptions(ACCESS_TOKEN_AUDIENCE, env.JWT_ACCESS_EXPIRES_IN),
  );

export const signRefreshToken = (payload: RefreshTokenPayload): string =>
  jwt.sign(
    payload,
    env.JWT_REFRESH_SECRET,
    createSignOptions(REFRESH_TOKEN_AUDIENCE, env.JWT_REFRESH_EXPIRES_IN),
  );

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, {
    audience: ACCESS_TOKEN_AUDIENCE,
    issuer: "underflow-api",
  }) as AccessTokenPayload;

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET, {
    audience: REFRESH_TOKEN_AUDIENCE,
    issuer: "underflow-api",
  }) as RefreshTokenPayload;
