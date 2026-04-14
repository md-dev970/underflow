type LogLevel = "debug" | "info" | "warn" | "error";

type LogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | Record<string, unknown>
  | Array<unknown>;

export type LogContext = Record<string, LogValue>;

const levelWeight: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const readLevel = (): LogLevel => {
  const value = process.env.LOG_LEVEL;

  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }

  return "info";
};

const formatValue = (value: LogValue): unknown => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item instanceof Date) {
        return item.toISOString();
      }

      return item;
    });
  }

  return value;
};

const shouldLog = (level: LogLevel): boolean => levelWeight[level] >= levelWeight[readLevel()];

const emit = (level: LogLevel, message: string, context: LogContext = {}): void => {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "underflow-api",
    environment: process.env.NODE_ENV ?? "development",
    ...Object.fromEntries(
      Object.entries(context).map(([key, value]) => [key, formatValue(value)]),
    ),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    process.stderr.write(`${line}\n`);
    return;
  }

  process.stdout.write(`${line}\n`);
};

export const logger = {
  debug(message: string, context?: LogContext): void {
    emit("debug", message, context);
  },
  info(message: string, context?: LogContext): void {
    emit("info", message, context);
  },
  warn(message: string, context?: LogContext): void {
    emit("warn", message, context);
  },
  error(message: string, context?: LogContext): void {
    emit("error", message, context);
  },
};
