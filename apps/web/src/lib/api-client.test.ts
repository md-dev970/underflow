import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  apiRequest,
  AUTH_SESSION_EXPIRED_EVENT,
  clearCsrfToken,
} from "./api-client";

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

describe("apiRequest auth refresh", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const sessionExpiredListener = vi.fn();

  beforeEach(() => {
    clearCsrfToken();
    fetchMock.mockReset();
    sessionExpiredListener.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, sessionExpiredListener);
  });

  afterEach(() => {
    window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, sessionExpiredListener);
    vi.unstubAllGlobals();
  });

  test("refreshes once and retries the protected request after a 401", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "csrf-1" }))
      .mockResolvedValueOnce(jsonResponse({ user: { id: "user-1" } }))
      .mockResolvedValueOnce(jsonResponse({ workspaces: [] }));

    const result = await apiRequest<{ workspaces: unknown[] }>("/workspaces", {
      requireAuth: true,
    });

    expect(result).toEqual({ workspaces: [] });
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3080/api/v1/auth/refresh-token",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:3080/api/v1/workspaces",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      }),
    );
    expect(sessionExpiredListener).not.toHaveBeenCalled();
  });

  test("only emits session-expired after refresh fails", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "csrf-1" }))
      .mockResolvedValueOnce(jsonResponse({ message: "Refresh failed" }, { status: 401 }));

    await expect(
      apiRequest<{ workspaces: unknown[] }>("/workspaces", {
        requireAuth: true,
      }),
    ).rejects.toMatchObject({ status: 401 });

    expect(sessionExpiredListener).toHaveBeenCalledTimes(1);
  });

  test("deduplicates concurrent refresh attempts", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ csrfToken: "csrf-1" }))
      .mockResolvedValueOnce(jsonResponse({ user: { id: "user-1" } }))
      .mockResolvedValueOnce(jsonResponse({ workspaces: [] }))
      .mockResolvedValueOnce(jsonResponse({ alerts: [] }));

    const [workspaces, alerts] = await Promise.all([
      apiRequest<{ workspaces: unknown[] }>("/workspaces", { requireAuth: true }),
      apiRequest<{ alerts: unknown[] }>("/alerts", { requireAuth: true }),
    ]);

    expect(workspaces).toEqual({ workspaces: [] });
    expect(alerts).toEqual({ alerts: [] });

    const refreshCalls = fetchMock.mock.calls.filter(
      ([url]) => url === "http://localhost:3080/api/v1/auth/refresh-token",
    );
    expect(refreshCalls).toHaveLength(1);
  });
});
