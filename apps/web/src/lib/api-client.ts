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
let refreshSessionPromise: Promise<void> | null = null;

export const AUTH_SESSION_EXPIRED_EVENT = "underflow:auth-session-expired";

const parseResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  let data: unknown = {};

  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError(
        response.status,
        response.ok ? "Received a non-JSON response" : "Unexpected non-JSON error response",
        {
          responseTextPreview: text.slice(0, 200),
        },
      );
    }
  }

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

const createRequestInit = async (options: RequestOptions): Promise<RequestInit> => {
  const headers = new Headers();
  const requestInit: RequestInit = {
    method: options.method ?? "GET",
    credentials: "include",
    headers,
  };

  if (options.signal) {
    requestInit.signal = options.signal;
  }

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    requestInit.body = JSON.stringify(options.body);
  }

  if (options.csrf) {
    headers.set("x-csrf-token", await ensureCsrfToken());
  }

  return requestInit;
};

const sendRequest = async (path: string, requestInit: RequestInit): Promise<Response> =>
  fetch(`${appConfig.apiUrl}${path}`, requestInit);

const refreshAuthSession = async (): Promise<void> => {
  if (refreshSessionPromise) {
    return refreshSessionPromise;
  }

  refreshSessionPromise = (async () => {
    const response = await sendRequest(
      "/auth/refresh-token",
      await createRequestInit({
        method: "POST",
        csrf: true,
        body: {},
      }),
    );

    if (response.status === 403) {
      await getCsrfToken();
      const retryInit = await createRequestInit({
        method: "POST",
        csrf: true,
        body: {},
      });
      const retryResponse = await sendRequest("/auth/refresh-token", retryInit);
      await parseResponse<{ user: unknown }>(retryResponse);
      return;
    }

    await parseResponse<{ user: unknown }>(response);
  })().finally(() => {
    refreshSessionPromise = null;
  });

  return refreshSessionPromise;
};

export const apiRequest = async <T>(
  path: string,
  options: RequestOptions = {},
  hasRetriedAuth = false,
): Promise<T> => {
  const requestInit = await createRequestInit(options);
  const response = await sendRequest(path, requestInit);

  if (options.csrf && response.status === 403) {
    await getCsrfToken();
    const retryInit = await createRequestInit(options);
    const retryResponse = await sendRequest(path, retryInit);

    return parseResponse<T>(retryResponse);
  }

  if (options.requireAuth && response.status === 401 && path !== "/auth/refresh-token") {
    if (!hasRetriedAuth) {
      try {
        await refreshAuthSession();
        return apiRequest<T>(path, options, true);
      } catch {
        clearCsrfToken();
        notifySessionExpired();
      }
    } else {
      clearCsrfToken();
      notifySessionExpired();
    }
  }

  return parseResponse<T>(response);
};
