import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { AppTestProviders } from "../../test/render-app";
import { OverviewPage } from "./OverviewPage";
import { CreateWorkspacePage } from "./CreateWorkspacePage";
import { WorkspaceDetailPage } from "./WorkspaceDetailPage";
import { WorkspacesPage } from "./WorkspacesPage";
import { AwsAccountsPage } from "./AwsAccountsPage";
import { ConnectAwsAccountPage } from "./ConnectAwsAccountPage";
import { AlertsPage } from "./AlertsPage";
import { CreateAlertPage } from "./CreateAlertPage";
import { ProfileSettingsPage } from "./ProfileSettingsPage";
import { WorkspaceSettingsPage } from "./WorkspaceSettingsPage";

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
  remove: vi.fn(),
}));

const awsApiMock = vi.hoisted(() => ({
  get: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  verify: vi.fn(),
  sync: vi.fn(),
  summary: vi.fn(),
  byService: vi.fn(),
  timeseries: vi.fn(),
  syncHistory: vi.fn(),
}));

const alertsApiMock = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

const usersApiMock = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  updatePassword: vi.fn(),
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
  getSessions: vi.fn(),
  revokeSession: vi.fn(),
  logoutOtherSessions: vi.fn(),
  requestAccountDeletion: vi.fn(),
}));

vi.mock("../../lib/api/auth", () => ({
  authApi: authApiMock,
}));

vi.mock("../../lib/api/workspaces", () => ({
  workspacesApi: workspaceApiMock,
}));

vi.mock("../../lib/api/aws-accounts", () => ({
  awsAccountsApi: awsApiMock,
}));

vi.mock("../../lib/api/alerts", () => ({
  alertsApi: alertsApiMock,
}));

vi.mock("../../lib/api/users", () => ({
  usersApi: usersApiMock,
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

const workspace = {
  id: "workspace-1",
  name: "Platform",
  slug: "platform",
  ownerUserId: "user-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const awsAccount = {
  id: "aws-1",
  workspaceId: workspace.id,
  name: "Prod",
  awsAccountId: "123456789012",
  roleArn: "arn:aws:iam::123456789012:role/UnderflowCostExplorerRead",
  externalId: null,
  status: "pending",
  lastVerifiedAt: null,
  lastSyncAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const renderPage = (path: string, routePath: string, page: JSX.Element) =>
  render(
    <AppTestProviders initialEntries={[path]}>
      <Routes>
        <Route element={page} path={routePath} />
      </Routes>
    </AppTestProviders>,
  );

beforeEach(() => {
  authApiMock.getSession.mockResolvedValue({ user: signedInUser });
  authApiMock.logout.mockResolvedValue({ message: "Logged out" });
  workspaceApiMock.list.mockResolvedValue({ workspaces: [workspace] });
  workspaceApiMock.get.mockResolvedValue({ workspace });
  workspaceApiMock.create.mockResolvedValue({
    workspace: {
      ...workspace,
      id: "workspace-2",
      name: "Growth",
      slug: "growth",
    },
  });
  workspaceApiMock.remove.mockResolvedValue({
    deleted: {
      id: "workspace-1",
      deletedAwsAccountCount: 1,
      deletedAlertCount: 2,
      deletedSnapshotCount: 8,
      deletedSyncRunCount: 4,
      deletedNotificationCount: 3,
    },
  });
  awsApiMock.list.mockResolvedValue({ awsAccounts: [] });
  awsApiMock.create.mockResolvedValue({ awsAccount });
  awsApiMock.remove.mockResolvedValue({
    deleted: {
      id: "aws-1",
      workspaceId: workspace.id,
      deletedAlertCount: 2,
      deletedSyncRunCount: 4,
      deletedSnapshotCount: 8,
    },
  });
  awsApiMock.verify.mockResolvedValue({ awsAccount: { ...awsAccount, status: "verified" } });
  awsApiMock.summary.mockResolvedValue({
    summary: {
      totalAmount: 0,
      currency: "USD",
      from: "2026-01-01",
      to: "2026-01-31",
    },
  });
  awsApiMock.byService.mockResolvedValue({ services: [] });
  awsApiMock.timeseries.mockResolvedValue({ points: [] });
  awsApiMock.get.mockResolvedValue({ awsAccount });
  awsApiMock.update.mockResolvedValue({ awsAccount: { ...awsAccount, name: "Prod updated" } });
  alertsApiMock.list.mockResolvedValue({ alerts: [] });
  alertsApiMock.remove.mockResolvedValue(undefined);
  usersApiMock.getPreferences.mockResolvedValue({
    preferences: {
      costAlerts: true,
      driftReports: true,
      maintenance: false,
      featureReleases: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  });
  usersApiMock.getSessions.mockResolvedValue({
    sessions: [
      {
        id: "session-current",
        deviceLabel: "Mac",
        userAgent: "Mozilla/5.0 (Macintosh)",
        ipAddress: "127.0.0.1",
        createdAt: "2026-01-01T00:00:00.000Z",
        lastUsedAt: "2026-01-01T00:00:00.000Z",
        revokedAt: null,
        isCurrent: true,
      },
    ],
  });
  usersApiMock.requestAccountDeletion.mockResolvedValue({
    message: "Account deletion request submitted successfully",
  });
  vi.spyOn(window, "confirm").mockImplementation(() => true);
});

afterEach(() => {
  vi.clearAllMocks();
});

test("workspace creation selects the new workspace and navigates to the detail page", async () => {
  renderPage("/app/workspaces/new", "/app/workspaces/new", <CreateWorkspacePage />);

  fireEvent.change(screen.getByLabelText("Workspace name"), {
    target: { value: "Growth" },
  });
  fireEvent.change(screen.getByLabelText("Slug"), {
    target: { value: "growth" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

  await waitFor(() => {
    expect(workspaceApiMock.create).toHaveBeenCalledWith({ name: "Growth", slug: "growth" });
  });
  await waitFor(() => {
    expect(window.localStorage.getItem("underflow-active-workspace")).toBe("workspace-2");
  });
});

test("workspaces page quick-create updates the active workspace", async () => {
  renderPage("/app/workspaces", "/app/workspaces", <WorkspacesPage />);

  const nameField = await screen.findByLabelText("Workspace name");

  fireEvent.change(nameField, {
    target: { value: "Growth" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Quick create" }));

  await waitFor(() => {
    expect(workspaceApiMock.create).toHaveBeenCalledWith({ name: "Growth", slug: "growth" });
  });
  await waitFor(() => {
    expect(window.localStorage.getItem("underflow-active-workspace")).toBe("workspace-2");
  });
});

test("workspace detail handles missing workspaces with a retryable error state", async () => {
  workspaceApiMock.get.mockRejectedValue(new Error("Workspace lookup failed"));

  renderPage(
    "/app/workspaces/workspace-1",
    "/app/workspaces/:workspaceId",
    <WorkspaceDetailPage />,
  );

  await waitFor(() => {
    expect(screen.getByText("We couldn't load this workspace")).toBeTruthy();
  });

  fireEvent.click(screen.getByRole("button", { name: "Try again" }));

  await waitFor(() => {
    expect(workspaceApiMock.get).toHaveBeenCalledTimes(2);
  });
});

test("overview exposes a connect AWS action when the active workspace has no accounts", async () => {
  window.localStorage.setItem("underflow-active-workspace", "workspace-1");
  renderPage("/app/overview", "/app/overview", <OverviewPage />);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Connect AWS account" })).toBeTruthy();
  });
});

test("aws accounts page provides a clear route back to the workspace", async () => {
  renderPage(
    "/app/workspaces/workspace-1/aws-accounts",
    "/app/workspaces/:workspaceId/aws-accounts",
    <AwsAccountsPage />,
  );

  const link = await screen.findByRole("link", { name: "Back to workspace" });
  expect(link.getAttribute("href")).toBe("/app/workspaces/workspace-1");
});

test("aws account connection shows inline errors and then verifies successfully", async () => {
  awsApiMock.create
    .mockRejectedValueOnce(new Error("Role ARN is invalid"))
    .mockResolvedValueOnce({ awsAccount });

  renderPage(
    "/app/workspaces/workspace-1/aws-accounts/connect",
    "/app/workspaces/:workspaceId/aws-accounts/connect",
    <ConnectAwsAccountPage />,
  );

  fireEvent.change(screen.getByLabelText("Account nickname"), { target: { value: "Prod" } });
  fireEvent.change(screen.getByLabelText("AWS account ID"), { target: { value: "123456789012" } });

  fireEvent.click(screen.getByRole("button", { name: "Save AWS account" }));

  await waitFor(() => {
    expect(screen.getByText("Role ARN is invalid")).toBeTruthy();
  });

  fireEvent.click(screen.getByRole("button", { name: "Save AWS account" }));

  await waitFor(() => {
    expect(screen.getByText("Account saved")).toBeTruthy();
  });

  fireEvent.click(screen.getByRole("button", { name: "Verify connection" }));

  await waitFor(() => {
    expect(awsApiMock.verify).toHaveBeenCalledWith("aws-1");
  });
});

test("editing an AWS account updates the configuration and clears the external id", async () => {
  awsApiMock.get.mockResolvedValue({
    awsAccount: {
      ...awsAccount,
      externalId: "underflow-dev-shared-secret",
      status: "verified",
    },
  });
  awsApiMock.update.mockResolvedValue({
    awsAccount: {
      ...awsAccount,
      name: "Prod updated",
      externalId: null,
      status: "pending",
    },
  });

  renderPage(
    "/app/workspaces/workspace-1/aws-accounts/aws-1/edit",
    "/app/workspaces/:workspaceId/aws-accounts/:awsAccountId/edit",
    <ConnectAwsAccountPage />,
  );

  const nicknameField = await screen.findByLabelText("Account nickname");
  await waitFor(() => {
    expect((nicknameField as HTMLInputElement).value).toBe("Prod");
  });

  fireEvent.change(nicknameField, { target: { value: "Prod updated" } });
  await waitFor(() => {
    expect((nicknameField as HTMLInputElement).value).toBe("Prod updated");
  });
  fireEvent.change(screen.getByLabelText("External ID"), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

  await waitFor(() => {
    expect(awsApiMock.update).toHaveBeenCalledWith("aws-1", {
      name: "Prod updated",
      awsAccountId: "123456789012",
      externalId: null,
    });
  });
});

test("aws accounts page disconnects an account after confirmation", async () => {
  awsApiMock.list.mockResolvedValue({
    awsAccounts: [{ ...awsAccount, status: "verified" }],
  });
  const originalConfirm = window.confirm;
  window.confirm = vi.fn(() => true);

  try {
    renderPage(
      "/app/workspaces/workspace-1/aws-accounts",
      "/app/workspaces/:workspaceId/aws-accounts",
      <AwsAccountsPage />,
    );

    await waitFor(() => {
      expect(screen.getByText("Prod")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

    await waitFor(() => {
      expect(awsApiMock.remove).toHaveBeenCalledWith("aws-1");
    });
  } finally {
    window.confirm = originalConfirm;
  }
});

test("workspace settings deletes the active workspace after confirmation", async () => {
  window.localStorage.setItem("underflow-active-workspace", "workspace-1");
  const originalConfirm = window.confirm;
  window.confirm = vi.fn(() => true);

  try {
    render(
      <AppTestProviders initialEntries={["/app/settings/workspace"]}>
        <Routes>
          <Route element={<WorkspaceSettingsPage />} path="/app/settings/workspace" />
          <Route element={<div>Workspaces index</div>} path="/app/workspaces" />
        </Routes>
      </AppTestProviders>,
    );

    const deleteButton = await screen.findByRole("button", { name: "Delete workspace" });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(workspaceApiMock.remove).toHaveBeenCalledWith("workspace-1");
    });
  } finally {
    window.confirm = originalConfirm;
  }
});

test("alerts page supports delete confirmation and list reload", async () => {
  alertsApiMock.list
    .mockResolvedValueOnce({
      alerts: [
        {
          id: "alert-1",
          workspaceId: workspace.id,
          awsAccountId: null,
          name: "Prod budget",
          thresholdAmount: 1200,
          currency: "USD",
          period: "monthly",
          recipientEmail: "alerts@example.com",
          isActive: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    })
    .mockResolvedValueOnce({ alerts: [] });

  renderPage(
    "/app/workspaces/workspace-1/alerts",
    "/app/workspaces/:workspaceId/alerts",
    <AlertsPage />,
  );

  await waitFor(() => {
    expect(screen.getByText("Prod budget")).toBeTruthy();
  });

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete alert" }));

  await waitFor(() => {
    expect(alertsApiMock.remove).toHaveBeenCalledWith("alert-1");
  });
  await waitFor(() => {
    expect(screen.getByText("No alert rules yet")).toBeTruthy();
  });
});

test("alert creation submits a scoped rule", async () => {
  awsApiMock.list.mockResolvedValue({ awsAccounts: [{ ...awsAccount, status: "verified" }] });
  alertsApiMock.create.mockResolvedValue({
    alert: {
      id: "alert-2",
      workspaceId: workspace.id,
      awsAccountId: awsAccount.id,
      name: "Forecast guardrail",
      thresholdAmount: 1800,
      currency: "USD",
      period: "monthly",
      recipientEmail: "owners@example.com",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  });

  render(
    <AppTestProviders initialEntries={["/app/workspaces/workspace-1/alerts/new"]}>
      <Routes>
        <Route element={<CreateAlertPage />} path="/app/workspaces/:workspaceId/alerts/new" />
        <Route element={<div>Alerts index</div>} path="/app/workspaces/:workspaceId/alerts" />
      </Routes>
    </AppTestProviders>,
  );

  await waitFor(() => {
    expect(screen.getByRole("option", { name: "Prod" })).toBeTruthy();
  });

  fireEvent.change(screen.getByLabelText("Alert name"), {
    target: { value: "Forecast guardrail" },
  });
  fireEvent.change(screen.getByLabelText("Threshold amount"), {
    target: { value: "1800" },
  });
  fireEvent.change(screen.getByLabelText("Recipient email"), {
    target: { value: "owners@example.com" },
  });
  fireEvent.change(screen.getByLabelText("AWS account scope"), {
    target: { value: "aws-1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create alert" }));

  await waitFor(() => {
    expect(alertsApiMock.create).toHaveBeenCalledWith("workspace-1", {
      name: "Forecast guardrail",
      thresholdAmount: 1800,
      recipientEmail: "owners@example.com",
      currency: "USD",
      period: "monthly",
      awsAccountId: "aws-1",
    });
  });
});

test("profile settings submits an account deletion request", async () => {
  renderPage(
    "/app/settings/profile",
    "/app/settings/profile",
    <ProfileSettingsPage />,
  );

  fireEvent.click(await screen.findByRole("button", { name: "Request Account Deletion" }));

  await waitFor(() => {
    expect(usersApiMock.requestAccountDeletion).toHaveBeenCalledTimes(1);
  });
});
