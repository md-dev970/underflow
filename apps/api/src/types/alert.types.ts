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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBudgetAlertInput {
  name: string;
  thresholdAmount: number;
  currency?: string | undefined;
  period?: string | undefined;
  recipientEmail: string;
  awsAccountId?: string | undefined;
}

export interface UpdateBudgetAlertInput {
  name?: string | undefined;
  thresholdAmount?: number | undefined;
  currency?: string | undefined;
  period?: string | undefined;
  recipientEmail?: string | undefined;
  isActive?: boolean | undefined;
}
