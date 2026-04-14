export interface NotificationDelivery {
  id: string;
  alertEventId: string;
  channel: string;
  recipient: string;
  status: string;
  sentAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}

export interface NotificationFeedItem extends NotificationDelivery {
  workspaceId: string;
  workspaceName: string;
  alertId: string;
  alertName: string;
  awsAccountId: string | null;
  awsAccountName: string | null;
  triggeredAt: Date;
}
