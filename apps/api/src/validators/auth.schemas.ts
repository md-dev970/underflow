import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(30).optional(),
  avatarUrl: z.string().trim().url().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(8).max(128),
});
