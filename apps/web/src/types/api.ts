export interface ApiErrorPayload {
  message: string;
  details?: unknown;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: "admin" | "manager" | "customer";
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AwsAccount {
  id: string;
  workspaceId: string;
  name: string;
  awsAccountId: string;
  roleArn: string;
  externalId: string | null;
  status: string;
  lastVerifiedAt: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CostSummary {
  totalAmount: number;
  currency: string;
  from: string;
  to: string;
}

export interface ServiceCostBreakdownItem {
  serviceName: string;
  amount: number;
  currency: string;
}

export interface TimeseriesCostPoint {
  usageDate: string;
  amount: number;
  currency: string;
}

export interface BudgetAlert {
  id: string;
  workspaceId: string;
  awsAccountId: string | null;
  name: string;
  thresholdAmount: number;
  currency: string;
  period: string;
  recipientEmail: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDelivery {
  id: string;
  alertEventId: string;
  channel: string;
  recipient: string;
  status: string;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface NotificationFeedItem extends NotificationDelivery {
  workspaceId: string;
  workspaceName: string;
  alertId: string;
  alertName: string;
  awsAccountId: string | null;
  awsAccountName: string | null;
  triggeredAt: string;
}

export interface SyncHistoryItem {
  id: string;
  awsAccountId: string;
  awsAccountName: string;
  accountNumber: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
}

export interface UserNotificationPreferences {
  costAlerts: boolean;
  driftReports: boolean;
  maintenance: boolean;
  featureReleases: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  id: string;
  deviceLabel: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  revokedAt: string | null;
  isCurrent: boolean;
}
