import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { RouteLoading } from "../components/feedback/Feedback";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { RequireAuth, RequireGuest } from "./guards";

const LandingPage = lazy(async () =>
  import("../pages/public/LandingPage").then((module) => ({ default: module.LandingPage })),
);
const LoginPage = lazy(async () =>
  import("../pages/auth/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const SignupPage = lazy(async () =>
  import("../pages/auth/SignupPage").then((module) => ({ default: module.SignupPage })),
);
const ForgotPasswordPage = lazy(async () =>
  import("../pages/auth/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(async () =>
  import("../pages/auth/ResetPasswordPage").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const OverviewPage = lazy(async () =>
  import("../pages/app/OverviewPage").then((module) => ({ default: module.OverviewPage })),
);
const WorkspacesPage = lazy(async () =>
  import("../pages/app/WorkspacesPage").then((module) => ({ default: module.WorkspacesPage })),
);
const CreateWorkspacePage = lazy(async () =>
  import("../pages/app/CreateWorkspacePage").then((module) => ({
    default: module.CreateWorkspacePage,
  })),
);
const WorkspaceDetailPage = lazy(async () =>
  import("../pages/app/WorkspaceDetailPage").then((module) => ({
    default: module.WorkspaceDetailPage,
  })),
);
const AwsAccountsPage = lazy(async () =>
  import("../pages/app/AwsAccountsPage").then((module) => ({ default: module.AwsAccountsPage })),
);
const ConnectAwsAccountPage = lazy(async () =>
  import("../pages/app/ConnectAwsAccountPage").then((module) => ({
    default: module.ConnectAwsAccountPage,
  })),
);
const CostSummaryPage = lazy(async () =>
  import("../pages/app/CostSummaryPage").then((module) => ({
    default: module.CostSummaryPage,
  })),
);
const CostByServicePage = lazy(async () =>
  import("../pages/app/CostByServicePage").then((module) => ({
    default: module.CostByServicePage,
  })),
);
const CostTimeseriesPage = lazy(async () =>
  import("../pages/app/CostTimeseriesPage").then((module) => ({
    default: module.CostTimeseriesPage,
  })),
);
const SyncHistoryPage = lazy(async () =>
  import("../pages/app/SyncHistoryPage").then((module) => ({
    default: module.SyncHistoryPage,
  })),
);
const AlertsPage = lazy(async () =>
  import("../pages/app/AlertsPage").then((module) => ({ default: module.AlertsPage })),
);
const CreateAlertPage = lazy(async () =>
  import("../pages/app/CreateAlertPage").then((module) => ({
    default: module.CreateAlertPage,
  })),
);
const NotificationsPage = lazy(async () =>
  import("../pages/app/NotificationsPage").then((module) => ({
    default: module.NotificationsPage,
  })),
);
const ProfileSettingsPage = lazy(async () =>
  import("../pages/app/ProfileSettingsPage").then((module) => ({
    default: module.ProfileSettingsPage,
  })),
);
const WorkspaceSettingsPage = lazy(async () =>
  import("../pages/app/WorkspaceSettingsPage").then((module) => ({
    default: module.WorkspaceSettingsPage,
  })),
);
const BillingPage = lazy(async () =>
  import("../pages/app/BillingPage").then((module) => ({ default: module.BillingPage })),
);
const NotFoundPage = lazy(async () =>
  import("../pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);

const AuthRouteFallback = (): JSX.Element => <RouteLoading heights={[280]} />;
const AppRouteFallback = (): JSX.Element => <RouteLoading heights={[56, 220, 320]} />;

const withFallback = (page: JSX.Element, fallback: JSX.Element): JSX.Element => (
  <Suspense fallback={fallback}>{page}</Suspense>
);

export const AppRouter = (): JSX.Element => (
  <Routes>
    <Route element={withFallback(<LandingPage />, <AuthRouteFallback />)} path="/" />
    <Route
      element={
        <RequireGuest>
          <AuthLayout />
        </RequireGuest>
      }
    >
      <Route element={withFallback(<LoginPage />, <AuthRouteFallback />)} path="/login" />
      <Route element={withFallback(<SignupPage />, <AuthRouteFallback />)} path="/signup" />
      <Route
        element={withFallback(<ForgotPasswordPage />, <AuthRouteFallback />)}
        path="/forgot-password"
      />
      <Route
        element={withFallback(<ResetPasswordPage />, <AuthRouteFallback />)}
        path="/reset-password"
      />
    </Route>

    <Route
      element={
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      }
      path="/app"
    >
      <Route element={<Navigate replace to="overview" />} index />
      <Route element={withFallback(<OverviewPage />, <AppRouteFallback />)} path="overview" />
      <Route
        element={withFallback(<WorkspacesPage />, <AppRouteFallback />)}
        path="workspaces"
      />
      <Route
        element={withFallback(<CreateWorkspacePage />, <AppRouteFallback />)}
        path="workspaces/new"
      />
      <Route
        element={withFallback(<WorkspaceDetailPage />, <AppRouteFallback />)}
        path="workspaces/:workspaceId"
      />
      <Route
        element={withFallback(<AwsAccountsPage />, <AppRouteFallback />)}
        path="workspaces/:workspaceId/aws-accounts"
      />
      <Route
        element={withFallback(<ConnectAwsAccountPage />, <AppRouteFallback />)}
        path="workspaces/:workspaceId/aws-accounts/connect"
      />
      <Route
        element={withFallback(<CostSummaryPage />, <AppRouteFallback />)}
        path="workspaces/:workspaceId/costs/summary"
      />
      <Route
        element={withFallback(<CostByServicePage />, <AppRouteFallback />)}
        path="workspaces/:workspaceId/costs/by-service"
      />
      <Route
        element={withFallback(<CostTimeseriesPage />, <AppRouteFallback />)}
        path="workspaces/:workspaceId/costs/timeseries"
      />
      <Route
        element={withFallback(<SyncHistoryPage />, <AppRouteFallback />)}
        path="workspaces/:workspaceId/sync-history"
      />
      <Route
        element={withFallback(<AlertsPage />, <AppRouteFallback />)}
        path="workspaces/:workspaceId/alerts"
      />
      <Route
        element={withFallback(<CreateAlertPage />, <AppRouteFallback />)}
        path="workspaces/:workspaceId/alerts/new"
      />
      <Route
        element={withFallback(<CreateAlertPage />, <AppRouteFallback />)}
        path="alerts/:alertId/edit"
      />
      <Route
        element={withFallback(<NotificationsPage />, <AppRouteFallback />)}
        path="notifications"
      />
      <Route
        element={withFallback(<ProfileSettingsPage />, <AppRouteFallback />)}
        path="settings/profile"
      />
      <Route
        element={withFallback(<WorkspaceSettingsPage />, <AppRouteFallback />)}
        path="settings/workspace"
      />
      <Route
        element={withFallback(<BillingPage />, <AppRouteFallback />)}
        path="settings/billing"
      />
    </Route>

    <Route element={withFallback(<NotFoundPage />, <AuthRouteFallback />)} path="*" />
  </Routes>
);
