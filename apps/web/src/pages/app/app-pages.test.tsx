import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { AppTestProviders } from "../../test/render-app";
import { CreateWorkspacePage } from "./CreateWorkspacePage";
import { WorkspaceDetailPage } from "./WorkspaceDetailPage";
import { WorkspacesPage } from "./WorkspacesPage";
import { ConnectAwsAccountPage } from "./ConnectAwsAccountPage";
import { AlertsPage } from "./AlertsPage";
import { CreateAlertPage } from "./CreateAlertPage";

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

const awsApiMock = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
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
  roleArn: "arn:aws:iam::123456789012:role/Underflow",
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
  awsApiMock.list.mockResolvedValue({ awsAccounts: [] });
  awsApiMock.create.mockResolvedValue({ awsAccount });
  awsApiMock.verify.mockResolvedValue({ awsAccount: { ...awsAccount, status: "verified" } });
  alertsApiMock.list.mockResolvedValue({ alerts: [] });
  alertsApiMock.remove.mockResolvedValue(undefined);
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

  fireEvent.change(screen.getByLabelText("Workspace name"), {
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
  fireEvent.change(screen.getByLabelText("Role ARN"), {
    target: { value: "arn:aws:iam::123456789012:role/Underflow" },
  });

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
