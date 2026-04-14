import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";
import { requestContextMiddleware } from "./middlewares/request-context.middleware.js";
import { requestLoggingMiddleware } from "./middlewares/request-logging.middleware.js";
import { apiRouter } from "./routes/index.js";

export const app = express();
const stripeWebhookPath = "/api/v1/subscriptions/webhook/stripe";
const jsonParser = express.json();

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(requestContextMiddleware);
app.use(cookieParser());
app.use(stripeWebhookPath, express.raw({ type: "application/json" }));
app.use((req, res, next) => {
  if (req.originalUrl === stripeWebhookPath) {
    next();
    return;
  }

  jsonParser(req, res, next);
});
app.use(requestLoggingMiddleware);

app.use("/api/v1", apiRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
