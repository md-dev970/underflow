import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { ApiError } from "../lib/api-client";
import { renderApp } from "../test/render-app";

const authApiMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}));

const workspaceApiMock = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../lib/api/auth", () => ({
  authApi: authApiMock,
}));

vi.mock("../lib/api/workspaces", () => ({
  workspacesApi: workspaceApiMock,
}));

const signedInUser = {
  id: "user-1",
  email: "user@example.com",
  firstName: "Morgan",
  lastName: "Lee",
  phone: null,
  avatarUrl: null,
  role: "customer" as const,
  isActive: true,
  isEmailVerified: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  workspaceApiMock.list.mockResolvedValue({ workspaces: [] });
  authApiMock.logout.mockResolvedValue({ message: "Logged out" });
});

afterEach(() => {
  vi.clearAllMocks();
  window.history.pushState({}, "", "/");
});

test("guest users are redirected away from protected routes", async () => {
  authApiMock.getSession.mockRejectedValue(new ApiError(401, "Unauthorized"));
  authApiMock.refresh.mockRejectedValue(new ApiError(401, "Unauthorized"));

  renderApp(["/app/overview"]);

  await waitFor(() => {
    expect(screen.getByText("Welcome back")).toBeTruthy();
  });
});

test("authenticated users are redirected away from guest-only routes", async () => {
  authApiMock.getSession.mockResolvedValue({ user: signedInUser });

  renderApp(["/login"]);

  await waitFor(() => {
    expect(screen.getByText("Create Workspace")).toBeTruthy();
  });
});

test("authenticated users without workspaces are redirected to onboarding", async () => {
  authApiMock.getSession.mockResolvedValue({ user: signedInUser });

  renderApp(["/app/overview"]);

  await waitFor(() => {
    expect(screen.getByText("Create Workspace")).toBeTruthy();
  });
});
