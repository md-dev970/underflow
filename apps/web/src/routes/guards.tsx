import { Link, Navigate, useLocation } from "react-router-dom";

import { EmptyState, RouteLoading } from "../components/feedback/Feedback";
import { Button } from "../components/forms/Button";
import { useAuth } from "../features/auth";

export const RequireAuth = ({
  children,
}: {
  children: JSX.Element;
}): JSX.Element => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <RouteLoading heights={[42, 220]} />;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return children;
};

export const RequireGuest = ({
  children,
}: {
  children: JSX.Element;
}): JSX.Element => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoading heights={[340]} />;
  }

  if (isAuthenticated) {
    return <Navigate replace to="/app/overview" />;
  }

  return children;
};

export const MissingWorkspaceState = (): JSX.Element => (
  <EmptyState
    action={
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link to="/app/workspaces/new">
          <Button>Create workspace</Button>
        </Link>
        <Link to="/app/workspaces">
          <Button variant="secondary">View workspaces</Button>
        </Link>
      </div>
    }
    description="Create your first workspace to start connecting AWS accounts and syncing cost data."
    title="No workspace selected"
  />
);
