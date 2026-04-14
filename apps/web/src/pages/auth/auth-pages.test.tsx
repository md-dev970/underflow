import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { ToastProvider } from "../../features/toast";
import { AuthProvider } from "../../features/auth";
import { AUTH_SESSION_EXPIRED_EVENT, ApiError } from "../../lib/api-client";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { LoginPage } from "./LoginPage";
import { ResetPasswordPage } from "./ResetPasswordPage";

const authApiMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock("../../lib/api/auth", () => ({
  authApi: authApiMock,
}));

beforeEach(() => {
  authApiMock.getSession.mockRejectedValue(new ApiError(401, "Unauthorized"));
  authApiMock.refresh.mockRejectedValue(new ApiError(401, "Unauthorized"));
  authApiMock.forgotPassword.mockResolvedValue({ message: "ok" });
  authApiMock.resetPassword.mockResolvedValue({ message: "ok" });
  authApiMock.logout.mockResolvedValue({ message: "Logged out successfully" });
});

afterEach(() => {
  vi.clearAllMocks();
  window.history.pushState({}, "", "/");
});

test("forgot-password submits and shows a neutral success state", async () => {
  render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );

  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "test@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

  await waitFor(() => {
    expect(
      screen.getByText("If an account exists for that email, a password reset link has been sent."),
    ).toBeTruthy();
  });
});

test("reset-password shows an invalid-link state when the token is missing", () => {
  render(
    <MemoryRouter initialEntries={["/reset-password"]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );

  expect(screen.getByText("Request a new reset link")).toBeTruthy();
});

test("reset-password validates password confirmation before submit", async () => {
  render(
    <MemoryRouter initialEntries={["/reset-password?token=reset-token"]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );

  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "NewPassword123!" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "DifferentPassword123!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Update password" }));

  await waitFor(() => {
    expect(screen.getByText("Passwords do not match.")).toBeTruthy();
  });
});

test("session expiry redirects to login and shows a toast", async () => {
  authApiMock.getSession.mockResolvedValue({
    user: {
      id: "user-1",
      email: "user@example.com",
      firstName: "Test",
      lastName: "User",
      phone: null,
      avatarUrl: null,
      role: "customer",
      isActive: true,
      isEmailVerified: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  });

  render(
    <ToastProvider>
      <MemoryRouter initialEntries={["/app/overview"]}>
        <AuthProvider>
          <Routes>
            <Route element={<div>Overview</div>} path="/app/overview" />
            <Route element={<LoginPage />} path="/login" />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </ToastProvider>,
  );

  await waitFor(() => {
    expect(screen.getByText("Overview")).toBeTruthy();
  });

  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));

  await waitFor(() => {
    expect(screen.getByText("Welcome back")).toBeTruthy();
  });
  await waitFor(() => {
    expect(screen.getByText("Session expired")).toBeTruthy();
  });
});
