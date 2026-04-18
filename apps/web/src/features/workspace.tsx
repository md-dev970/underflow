import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { workspacesApi } from "../lib/api/workspaces";
import type { Workspace } from "../types/api";
import { useAuth } from "./auth";

const ACTIVE_WORKSPACE_KEY = "underflow-active-workspace";

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  refreshWorkspaces: () => Promise<void>;
  setActiveWorkspaceId: (workspaceId: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setActiveWorkspaceId = (workspaceId: string | null): void => {
    if (workspaceId) {
      window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
    } else {
      window.localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    }

    setActiveWorkspaceIdState(workspaceId);
  };

  const refreshWorkspaces = async (): Promise<void> => {
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }

    if (!isAuthenticated) {
      setWorkspaces([]);
      window.localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
      setActiveWorkspaceIdState(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await workspacesApi.list();
      setWorkspaces(result.workspaces);

      const storedWorkspaceId = window.localStorage.getItem(ACTIVE_WORKSPACE_KEY);
      const matchingWorkspace = result.workspaces.find(
        (workspace) => workspace.id === storedWorkspaceId,
      );
      const nextWorkspaceId = matchingWorkspace?.id ?? result.workspaces[0]?.id ?? null;

      if (nextWorkspaceId) {
        window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, nextWorkspaceId);
      }

      setActiveWorkspaceIdState(nextWorkspaceId);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshWorkspaces();
  }, [isAuthenticated, isAuthLoading]);

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspaceId,
      activeWorkspace:
        workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
      isLoading,
      refreshWorkspaces,
      setActiveWorkspaceId,
    }),
    [workspaces, activeWorkspaceId, isLoading],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextValue => {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }

  return context;
};
