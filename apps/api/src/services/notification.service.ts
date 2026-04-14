import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { notificationRepository } from "../repositories/notification.repository.js";
import type { NotificationFeedItem } from "../types/notification.types.js";

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

    await notificationRepository.create({
      alertEventId: input.alertEventId,
      recipient: input.recipient,
      status: "sent",
      sentAt: new Date(),
    });
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
