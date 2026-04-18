import { apiRequest } from "../api-client";
import type { Workspace } from "../../types/api";

export const workspacesApi = {
  list: () => apiRequest<{ workspaces: Workspace[] }>("/workspaces", { requireAuth: true }),
  get: (workspaceId: string) =>
    apiRequest<{ workspace: Workspace }>(`/workspaces/${workspaceId}`, {
      requireAuth: true,
    }),
  create: (payload: { name: string; slug: string }) =>
    apiRequest<{ workspace: Workspace }>("/workspaces", {
      method: "POST",
      body: payload,
      requireAuth: true,
    }),
  update: (workspaceId: string, payload: { name?: string; slug?: string }) =>
    apiRequest<{ workspace: Workspace }>(`/workspaces/${workspaceId}`, {
      method: "PATCH",
      body: payload,
      requireAuth: true,
    }),
  remove: (workspaceId: string) =>
    apiRequest<{
      deleted: {
        id: string;
        deletedAwsAccountCount: number;
        deletedAlertCount: number;
        deletedSnapshotCount: number;
        deletedSyncRunCount: number;
        deletedNotificationCount: number;
      };
    }>(`/workspaces/${workspaceId}`, {
      method: "DELETE",
      requireAuth: true,
    }),
};
