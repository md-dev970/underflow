import { apiRequest, clearCsrfToken, getCsrfToken } from "../api-client";
import type { PublicUser } from "../../types/api";

export interface AuthPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends AuthPayload {
  firstName: string;
  lastName: string;
}

export const authApi = {
  getSession: () => apiRequest<{ user: PublicUser }>("/auth/me"),
  login: async (payload: AuthPayload) => {
    await getCsrfToken();
    return apiRequest<{ user: PublicUser }>("/auth/login", {
      method: "POST",
      csrf: true,
      body: payload,
    });
  },
  register: async (payload: RegisterPayload) => {
    await getCsrfToken();
    return apiRequest<{ user: PublicUser }>("/auth/register", {
      method: "POST",
      csrf: true,
      body: payload,
    });
  },
  refresh: async () => {
    await getCsrfToken();
    return apiRequest<{ user: PublicUser }>("/auth/refresh-token", {
      method: "POST",
      csrf: true,
      body: {},
    });
  },
  logout: async () => {
    await getCsrfToken();
    const result = await apiRequest<{ message: string }>("/auth/logout", {
      method: "POST",
      csrf: true,
      body: {},
    });
    clearCsrfToken();
    return result;
  },
  forgotPassword: (payload: { email: string }) =>
    apiRequest<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: payload,
    }),
  resetPassword: (payload: { token: string; password: string }) =>
    apiRequest<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: payload,
    }),
};
