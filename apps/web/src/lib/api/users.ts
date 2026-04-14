import { apiRequest } from "../api-client";
import type {
  PublicUser,
  UserNotificationPreferences,
  UserSession,
} from "../../types/api";

export const usersApi = {
  updateProfile: (payload: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    avatarUrl?: string | null;
  }) =>
    apiRequest<{ user: PublicUser }>("/users/me", {
      method: "PATCH",
      body: payload,
      requireAuth: true,
    }),
  updatePassword: (payload: { currentPassword: string; newPassword: string }) =>
    apiRequest<{ message: string }>("/users/me/password", {
      method: "PATCH",
      body: payload,
      requireAuth: true,
    }),
  getPreferences: () =>
    apiRequest<{ preferences: UserNotificationPreferences }>("/users/me/preferences", {
      requireAuth: true,
    }),
  updatePreferences: (payload: {
    costAlerts: boolean;
    driftReports: boolean;
    maintenance: boolean;
    featureReleases: boolean;
  }) =>
    apiRequest<{ preferences: UserNotificationPreferences }>("/users/me/preferences", {
      method: "PATCH",
      body: payload,
      requireAuth: true,
    }),
  getSessions: () =>
    apiRequest<{ sessions: UserSession[] }>("/users/me/sessions", {
      requireAuth: true,
    }),
  revokeSession: (sessionId: string) =>
    apiRequest<{ message: string }>(`/users/me/sessions/${sessionId}`, {
      method: "DELETE",
      requireAuth: true,
    }),
  logoutOtherSessions: () =>
    apiRequest<{ message: string }>("/users/me/sessions/logout-others", {
      method: "POST",
      body: {},
      requireAuth: true,
    }),
};
