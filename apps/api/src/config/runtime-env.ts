import dotenv from "dotenv";

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

const parseBoolean = (key: string, fallback: boolean): boolean => {
  const value = process.env[key];

  if (!value) {
    return fallback;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${key} must be either "true" or "false"`);
};

export const runtimeEnv = {
  NODE_ENV: getNodeEnv(),
  PORT: parsePort(),
  DATABASE_URL: getRequiredEnv("DATABASE_URL"),
  DATABASE_SSL_ENABLED: parseBoolean("DATABASE_SSL_ENABLED", false),
  DATABASE_SSL_REJECT_UNAUTHORIZED: parseBoolean(
    "DATABASE_SSL_REJECT_UNAUTHORIZED",
    false,
  ),
  AWS_REGION: process.env.AWS_REGION ?? "us-west-2",
  AWS_SES_REGION: process.env.AWS_SES_REGION ?? process.env.AWS_REGION ?? "us-west-2",
  AWS_SES_ACCESS_KEY_ID: process.env.AWS_SES_ACCESS_KEY_ID ?? "",
  AWS_SES_SECRET_ACCESS_KEY: process.env.AWS_SES_SECRET_ACCESS_KEY ?? "",
  COST_SYNC_LOOKBACK_DAYS: parseInteger("COST_SYNC_LOOKBACK_DAYS", 30),
  ALERT_EMAIL_FROM: process.env.ALERT_EMAIL_FROM ?? "alerts@example.com",
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? "console",
  AUTH_EMAIL_FROM: process.env.AUTH_EMAIL_FROM ?? "auth@example.com",
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
} as const;

