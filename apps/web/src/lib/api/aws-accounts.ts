import { apiRequest } from "../api-client";
import type {
  AwsAccount,
  CostSummary,
  ServiceCostBreakdownItem,
  SyncHistoryItem,
  TimeseriesCostPoint,
} from "../../types/api";

export const awsAccountsApi = {
  list: (workspaceId: string) =>
    apiRequest<{ awsAccounts: AwsAccount[] }>(
      `/workspaces/${workspaceId}/aws-accounts`,
      { requireAuth: true },
    ),
  create: (
    workspaceId: string,
    payload: {
      name: string;
      awsAccountId: string;
      roleArn: string;
      externalId?: string;
    },
  ) =>
    apiRequest<{ awsAccount: AwsAccount }>(
      `/workspaces/${workspaceId}/aws-accounts`,
      {
        method: "POST",
        body: payload,
        requireAuth: true,
      },
    ),
  verify: (awsAccountId: string) =>
    apiRequest<{ awsAccount: AwsAccount }>(`/aws-accounts/${awsAccountId}/verify`, {
      method: "POST",
      body: {},
      requireAuth: true,
    }),
  sync: (
    awsAccountId: string,
    payload: { from?: string; to?: string } = {},
  ) =>
    apiRequest<{ syncRunId: string; recordsSynced: number }>(
      `/aws-accounts/${awsAccountId}/sync`,
      {
        method: "POST",
        body: payload,
        requireAuth: true,
      },
    ),
  summary: (workspaceId: string, query: URLSearchParams) =>
    apiRequest<{ summary: CostSummary }>(
      `/workspaces/${workspaceId}/costs/summary?${query.toString()}`,
      { requireAuth: true },
    ),
  byService: (workspaceId: string, query: URLSearchParams) =>
    apiRequest<{ services: ServiceCostBreakdownItem[] }>(
      `/workspaces/${workspaceId}/costs/by-service?${query.toString()}`,
      { requireAuth: true },
    ),
  timeseries: (workspaceId: string, query: URLSearchParams) =>
    apiRequest<{ points: TimeseriesCostPoint[] }>(
      `/workspaces/${workspaceId}/costs/timeseries?${query.toString()}`,
      { requireAuth: true },
    ),
  syncHistory: (workspaceId: string, query: URLSearchParams) =>
    apiRequest<{ syncRuns: SyncHistoryItem[] }>(
      `/workspaces/${workspaceId}/sync-history?${query.toString()}`,
      { requireAuth: true },
    ),
};
