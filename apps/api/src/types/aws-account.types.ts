export interface AwsAccount {
  id: string;
  workspaceId: string;
  name: string;
  awsAccountId: string;
  roleArn: string;
  externalId: string | null;
  status: string;
  lastVerifiedAt: Date | null;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAwsAccountInput {
  name: string;
  awsAccountId: string;
  roleArn?: string | undefined;
  externalId?: string | undefined;
}

export interface UpdateAwsAccountInput {
  name: string;
  awsAccountId: string;
  roleArn?: string | undefined;
  externalId?: string | null | undefined;
}

export interface DeletedAwsAccountResult {
  id: string;
  workspaceId: string;
  deletedAlertCount: number;
  deletedSyncRunCount: number;
  deletedSnapshotCount: number;
}

export interface CostSyncResult {
  syncRunId: string;
  recordsSynced: number;
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

export interface CostQueryInput {
  from: string;
  to: string;
  awsAccountId?: string | undefined;
}

export interface SyncHistoryQueryInput {
  awsAccountId?: string | undefined;
  status?: string | undefined;
  limit?: number | undefined;
}

export interface SyncHistoryItem {
  id: string;
  awsAccountId: string;
  awsAccountName: string;
  accountNumber: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  errorMessage: string | null;
}
