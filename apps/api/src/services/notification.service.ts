import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { notificationRepository } from "../repositories/notification.repository.js";
import type { NotificationFeedItem } from "../types/notification.types.js";
import { emailService } from "./email.service.js";

export const notificationService = {
  async sendAlertEmail(input: {
    alertEventId: string;
    recipient: string;
    subject: string;
    body: string;
  }): Promise<void> {
    logger.info("Sending alert email", {
      provider: env.EMAIL_PROVIDER,
      from: env.ALERT_EMAIL_FROM,
      recipient: input.recipient,
      alertEventId: input.alertEventId,
    });

    try {
      await emailService.sendEmail({
        to: input.recipient,
        from: env.ALERT_EMAIL_FROM,
        subject: input.subject,
        text: input.body,
      });

      await notificationRepository.create({
        alertEventId: input.alertEventId,
        recipient: input.recipient,
        status: "sent",
        sentAt: new Date(),
      });
    } catch (error) {
      logger.error("Alert email delivery failed", {
        recipient: input.recipient,
        alertEventId: input.alertEventId,
        errorMessage: error instanceof Error ? error.message : "Unknown notification error",
      });

      await notificationRepository.create({
        alertEventId: input.alertEventId,
        recipient: input.recipient,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown notification error",
        sentAt: null,
      });
    }
  },

  async getFeedForUser(input: {
    userId: string;
    workspaceId?: string | undefined;
    status?: string | undefined;
    limit?: number | undefined;
  }): Promise<NotificationFeedItem[]> {
    return notificationRepository.findFeedForUser(input);
  },
};
