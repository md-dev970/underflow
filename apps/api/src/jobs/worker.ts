import { connectToDatabase } from "../config/db.js";
import { logger } from "../lib/logger.js";
import { startJobScheduler } from "./scheduler.js";

const startWorker = async (): Promise<void> => {
  await connectToDatabase();
  startJobScheduler();
  logger.info("Background jobs started");
};

startWorker().catch((error: unknown) => {
  logger.error("Failed to start worker", {
    errorMessage: error instanceof Error ? error.message : "Unknown worker error",
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
