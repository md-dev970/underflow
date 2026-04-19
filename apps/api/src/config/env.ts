import dotenv from "dotenv";

import {
  DEFAULT_ACCESS_TOKEN_EXPIRES_IN,
  DEFAULT_PASSWORD_RESET_EXPIRES_IN_MINUTES,
  DEFAULT_REFRESH_TOKEN_EXPIRES_IN,
} from "../constants/auth.constants.js";

dotenv.config();

type NodeEnvironment = "development" | "test" | "production";

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const getNodeEnv = (): NodeEnvironment => {
  const value = process.env.NODE_ENV;

  if (value === "production" || value === "test") {
    return value;
  }

  return "development";
};

const parsePort = (): number => {
  const value = process.env.PORT;

  if (!value) {
    return 3080;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error("PORT must be a valid number");
  }

  return parsed;
};

const parseInteger = (key: string, fallback: number): number => {
  const value = process.env[key];

  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`${key} must be a valid number`);
  }

  return parsed;
};

export const env = {
  NODE_ENV: getNodeEnv(),
  PORT: parsePort(),
  DATABASE_URL: getRequiredEnv("DATABASE_URL"),
  CSRF_SECRET: getRequiredEnv("CSRF_SECRET"),
  JWT_ACCESS_SECRET: getRequiredEnv("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: getRequiredEnv("JWT_REFRESH_SECRET"),
  JWT_ACCESS_EXPIRES_IN:
    process.env.JWT_ACCESS_EXPIRES_IN ?? DEFAULT_ACCESS_TOKEN_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN:
    process.env.JWT_REFRESH_EXPIRES_IN ?? DEFAULT_REFRESH_TOKEN_EXPIRES_IN,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  STRIPE_SUCCESS_URL: process.env.STRIPE_SUCCESS_URL ?? "",
  STRIPE_CANCEL_URL: process.env.STRIPE_CANCEL_URL ?? "",
  BILLING_ENABLED: process.env.BILLING_ENABLED === "true",
  AWS_REGION: process.env.AWS_REGION ?? "us-west-2",
  COST_SYNC_LOOKBACK_DAYS: Number.parseInt(
    process.env.COST_SYNC_LOOKBACK_DAYS ?? "30",
    10,
  ),
  ALERT_EMAIL_FROM: process.env.ALERT_EMAIL_FROM ?? "alerts@example.com",
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? "console",
  CLIENT_URL: process.env.CLIENT_URL ?? "http://localhost:5174",
  PASSWORD_RESET_EXPIRES_IN_MINUTES: Number.parseInt(
    process.env.PASSWORD_RESET_EXPIRES_IN_MINUTES ??
      String(DEFAULT_PASSWORD_RESET_EXPIRES_IN_MINUTES),
    10,
  ),
  AWS_SES_REGION: process.env.AWS_SES_REGION ?? process.env.AWS_REGION ?? "us-west-2",
  AWS_SES_ACCESS_KEY_ID: process.env.AWS_SES_ACCESS_KEY_ID ?? "",
  AWS_SES_SECRET_ACCESS_KEY: process.env.AWS_SES_SECRET_ACCESS_KEY ?? "",
  AUTH_EMAIL_FROM: process.env.AUTH_EMAIL_FROM ?? "auth@example.com",
  AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN ?? "",
  AUTH_COOKIE_SAME_SITE: process.env.AUTH_COOKIE_SAME_SITE ?? "lax",
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  RATE_LIMIT_AUTH_WINDOW_MS: parseInteger("RATE_LIMIT_AUTH_WINDOW_MS", 60_000),
  RATE_LIMIT_AUTH_MAX_REQUESTS: parseInteger("RATE_LIMIT_AUTH_MAX_REQUESTS", 10),
  RATE_LIMIT_MUTATION_WINDOW_MS: parseInteger("RATE_LIMIT_MUTATION_WINDOW_MS", 60_000),
  RATE_LIMIT_MUTATION_MAX_REQUESTS: parseInteger("RATE_LIMIT_MUTATION_MAX_REQUESTS", 20),
} as const;
