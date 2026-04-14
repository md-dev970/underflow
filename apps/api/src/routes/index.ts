import { Router } from "express";

import { awsAccountsRouter } from "./aws-accounts.routes.js";
import { authRouter } from "./auth.routes.js";
import { healthRouter } from "./health.routes.js";
import { notificationsRouter } from "./notifications.routes.js";
import { ordersRouter } from "./orders.routes.js";
import { organizationsRouter } from "./organizations.routes.js";
import { productsRouter } from "./products.routes.js";
import { subscriptionsRouter } from "./subscriptions.routes.js";
import { usersRouter } from "./users.routes.js";
import { workspacesRouter } from "./workspaces.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/workspaces", workspacesRouter);
apiRouter.use("/", awsAccountsRouter);
apiRouter.use("/organizations", organizationsRouter);
apiRouter.use("/products", productsRouter);
apiRouter.use("/orders", ordersRouter);
apiRouter.use("/subscriptions", subscriptionsRouter);
apiRouter.use("/notifications", notificationsRouter);
