import type { Request, Response } from "express";

import { subscriptionService } from "../services/subscription.service.js";
import { AppError } from "../utils/app-error.js";
import { validate } from "../utils/validation.js";
import { checkoutSessionSchema } from "../validators/subscription.schemas.js";

export const subscriptionController = {
  async createCheckoutSession(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const input = validate(checkoutSessionSchema, req.body);
    const result = await subscriptionService.createCheckoutSession(req.user.id, input);

    res.status(200).json(result);
  },

  async createPortalSession(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await subscriptionService.createPortalSession(req.user.id);

    res.status(200).json(result);
  },

  async getCurrent(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await subscriptionService.getCurrentSubscription(req.user.id);

    res.status(200).json(result);
  },

  async cancel(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await subscriptionService.cancelCurrentSubscription(req.user.id);

    res.status(200).json(result);
  },

  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers["stripe-signature"];
    const payload = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body ?? {}));

    await subscriptionService.handleStripeWebhook(
      typeof signature === "string" ? signature : undefined,
      payload,
    );

    res.status(200).json({ received: true });
  },
};
