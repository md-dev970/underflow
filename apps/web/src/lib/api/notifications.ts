import { apiRequest } from "../api-client";
import type { NotificationFeedItem } from "../../types/api";

export const notificationsApi = {
  list: (query: URLSearchParams) =>
    apiRequest<{ notifications: NotificationFeedItem[] }>(
      `/notifications?${query.toString()}`,
      { requireAuth: true },
    ),
};
