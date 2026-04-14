import type { Request, Response } from "express";

import {
  clearAuthCookies,
  setAuthCookies,
} from "../config/cookies.js";
import { generateCsrfToken } from "../config/csrf.js";
import { authService } from "../services/auth.service.js";
import type { RegisterInput } from "../types/auth.types.js";
import { AppError } from "../utils/app-error.js";
import {
  getRefreshTokenFromCookie,
  getSessionMetadataFromRequest,
} from "../utils/session.js";
import { validate } from "../utils/validation.js";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validators/auth.schemas.js";

const toRegisterInput = (
  payload: ReturnType<typeof registerSchema.parse>,
): RegisterInput => {
  const registerInput: RegisterInput = {
    email: payload.email,
    password: payload.password,
    firstName: payload.firstName,
    lastName: payload.lastName,
  };

  if (payload.phone) {
    registerInput.phone = payload.phone;
  }

  if (payload.avatarUrl) {
    registerInput.avatarUrl = payload.avatarUrl;
  }

  return registerInput;
};

export const authController = {
  async csrfToken(req: Request, res: Response): Promise<void> {
    const csrfToken = generateCsrfToken(req, res);

    res.status(200).json({ csrfToken });
  },

  async register(req: Request, res: Response): Promise<void> {
    const registerInput = toRegisterInput(validate(registerSchema, req.body));
    const result = await authService.register(
      registerInput,
      getSessionMetadataFromRequest(req),
    );

    setAuthCookies(res, result.tokens);
    res.status(201).json({ user: result.user });
  },

  async mobileRegister(req: Request, res: Response): Promise<void> {
    const registerInput = toRegisterInput(validate(registerSchema, req.body));
    const result = await authService.register(
      registerInput,
      getSessionMetadataFromRequest(req),
    );

    res.status(201).json(result);
  },

  async login(req: Request, res: Response): Promise<void> {
    const input = validate(loginSchema, req.body);
    const result = await authService.login(input, getSessionMetadataFromRequest(req));

    setAuthCookies(res, result.tokens);
    res.status(200).json({ user: result.user });
  },

  async mobileLogin(req: Request, res: Response): Promise<void> {
    const input = validate(loginSchema, req.body);
    const result = await authService.login(input, getSessionMetadataFromRequest(req));

    res.status(200).json(result);
  },

  async refreshToken(req: Request, res: Response): Promise<void> {
    const refreshToken = getRefreshTokenFromCookie(req);

    if (!refreshToken) {
      throw new AppError("Refresh token cookie is required", 401);
    }

    const result = await authService.refreshAccessToken(
      refreshToken,
      getSessionMetadataFromRequest(req),
    );

    setAuthCookies(res, result.tokens);
    res.status(200).json({ user: result.user });
  },

  async mobileRefreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = validate(refreshTokenSchema, req.body);
    const result = await authService.refreshAccessToken(
      refreshToken,
      getSessionMetadataFromRequest(req),
    );

    res.status(200).json(result);
  },

  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = getRefreshTokenFromCookie(req);

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    clearAuthCookies(res);
    res.status(200).json({ message: "Logged out successfully" });
  },

  async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = validate(forgotPasswordSchema, req.body);
    await authService.requestPasswordReset(email);

    res.status(200).json({
      message:
        "If an account exists for that email, a password reset link has been sent.",
    });
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, password } = validate(resetPasswordSchema, req.body);
    await authService.resetPassword(token, password);

    clearAuthCookies(res);
    res.status(200).json({ message: "Password reset successfully" });
  },

  async me(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const user = await authService.getCurrentUser(req.user.id);

    res.status(200).json({ user });
  },
};
