import { app } from "./app.js";
import { connectToDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

const startServer = async (): Promise<void> => {
  await connectToDatabase();

  app.listen(env.PORT, () => {
    logger.info("API listening", { port: env.PORT });
  });
};

startServer().catch((error: unknown) => {
  logger.error("Failed to start API", {
    errorMessage: error instanceof Error ? error.message : "Unknown startup error",
  });
  process.exit(1);
});

process.on("unhandledRejection", (error: unknown) => {
  logger.error("Unhandled rejection", {
    errorMessage: error instanceof Error ? error.message : "Unknown rejection",
  });
});

process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught exception", {
    errorMessage: error.message,
    stack: error.stack ?? null,
  });
  process.exit(1);
});
