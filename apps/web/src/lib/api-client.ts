import { appConfig } from "./config";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  csrf?: boolean;
  signal?: AbortSignal;
  requireAuth?: boolean;
}

let csrfTokenCache: string | null = null;

export const AUTH_SESSION_EXPIRED_EVENT = "underflow:auth-session-expired";

const parseResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : {};

  if (!response.ok) {
    const payload =
      typeof data === "object" && data !== null
        ? (data as { message?: string; details?: unknown })
        : undefined;

    throw new ApiError(
      response.status,
      payload?.message ?? "Request failed",
      payload?.details,
    );
  }

  return data as T;
};

export const getCsrfToken = async (): Promise<string> => {
  const response = await fetch(`${appConfig.apiUrl}/auth/csrf-token`, {
    method: "GET",
    credentials: "include",
  });

  const data = await parseResponse<{ csrfToken: string }>(response);
  csrfTokenCache = data.csrfToken;
  return data.csrfToken;
};

const ensureCsrfToken = async (): Promise<string> => csrfTokenCache ?? getCsrfToken();

export const clearCsrfToken = (): void => {
  csrfTokenCache = null;
};

const notifySessionExpired = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
};

export const apiRequest = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const headers = new Headers();
  const requestInit: RequestInit = {
    method: options.method ?? "GET",
    credentials: "include",
    headers,
  };

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    requestInit.body = JSON.stringify(options.body);
  }

  if (options.csrf) {
    headers.set("x-csrf-token", await ensureCsrfToken());
  }

  if (options.signal) {
    requestInit.signal = options.signal;
  }

  const response = await fetch(`${appConfig.apiUrl}${path}`, requestInit);

  if (options.csrf && response.status === 403) {
    headers.set("x-csrf-token", await getCsrfToken());
    const retryInit: RequestInit = {
      ...requestInit,
      headers,
    };
    const retryResponse = await fetch(`${appConfig.apiUrl}${path}`, retryInit);

    return parseResponse<T>(retryResponse);
  }

  if (options.requireAuth && response.status === 401) {
    clearCsrfToken();
    notifySessionExpired();
  }

  return parseResponse<T>(response);
};
