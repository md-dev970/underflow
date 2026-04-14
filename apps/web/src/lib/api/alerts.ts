import { apiRequest } from "../api-client";
import type { BudgetAlert } from "../../types/api";

export const alertsApi = {
  list: (workspaceId: string) =>
    apiRequest<{ alerts: BudgetAlert[] }>(`/workspaces/${workspaceId}/alerts`, {
      requireAuth: true,
    }),
  create: (
    workspaceId: string,
    payload: {
      name: string;
      thresholdAmount: number;
      recipientEmail: string;
      currency?: string;
      period?: string;
      awsAccountId?: string;
    },
  ) =>
    apiRequest<{ alert: BudgetAlert }>(`/workspaces/${workspaceId}/alerts`, {
      method: "POST",
      body: payload,
      requireAuth: true,
    }),
  update: (
    alertId: string,
    payload: {
      name?: string;
      thresholdAmount?: number;
      recipientEmail?: string;
      currency?: string;
      period?: string;
      isActive?: boolean;
    },
  ) =>
    apiRequest<{ alert: BudgetAlert }>(`/alerts/${alertId}`, {
      method: "PATCH",
      body: payload,
      requireAuth: true,
    }),
  remove: (alertId: string) =>
    apiRequest<void>(`/alerts/${alertId}`, {
      method: "DELETE",
      requireAuth: true,
    }),
};
