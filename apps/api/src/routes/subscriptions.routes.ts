import { Router } from "express";

import { subscriptionController } from "../controllers/subscription.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { billingEnabledMiddleware } from "../middlewares/billing-disabled.middleware.js";
import { conditionalCsrfProtection } from "../middlewares/conditional-csrf.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const subscriptionsRouter = Router();

subscriptionsRouter.use(billingEnabledMiddleware);

subscriptionsRouter.post(
  "/checkout-session",
  authMiddleware,
  conditionalCsrfProtection,
  asyncHandler(subscriptionController.createCheckoutSession),
);
subscriptionsRouter.post(
  "/portal-session",
  authMiddleware,
  conditionalCsrfProtection,
  asyncHandler(subscriptionController.createPortalSession),
);
subscriptionsRouter.get(
  "/current",
  authMiddleware,
  asyncHandler(subscriptionController.getCurrent),
);
subscriptionsRouter.post(
  "/cancel",
  authMiddleware,
  conditionalCsrfProtection,
  asyncHandler(subscriptionController.cancel),
);
subscriptionsRouter.post(
  "/webhook/stripe",
  asyncHandler(subscriptionController.handleStripeWebhook),
);
