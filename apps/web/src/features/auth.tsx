import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { authApi, type AuthPayload, type RegisterPayload } from "../lib/api/auth";
import {
  AUTH_SESSION_EXPIRED_EVENT,
  ApiError,
  clearCsrfToken,
} from "../lib/api-client";
import type { PublicUser } from "../types/api";
import { useToast } from "./toast";

interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: AuthPayload) => Promise<PublicUser>;
  register: (payload: RegisterPayload) => Promise<PublicUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setUser: (user: PublicUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasHandledExpiry, setHasHandledExpiry] = useState(false);

  const handleSessionExpired = useCallback(() => {
    clearCsrfToken();
    setUser(null);
    setHasHandledExpiry(true);

    if (location.pathname.startsWith("/app")) {
      showToast({
        title: "Session expired",
        description: "Please sign in again to continue.",
        tone: "warning",
      });
      navigate("/login", {
        replace: true,
        state: {
          from: {
            pathname: `${location.pathname}${location.search}`,
          },
        },
      });
    }
  }, [location.pathname, location.search, navigate, showToast]);

  const refreshSession = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const session = await authApi.getSession();
      setUser(session.user);
      setHasHandledExpiry(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        try {
          const refreshed = await authApi.refresh();
          setUser(refreshed.user);
          setHasHandledExpiry(false);
        } catch {
          handleSessionExpired();
        }
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  useEffect(() => {
    const listener = () => {
      if (!hasHandledExpiry) {
        handleSessionExpired();
      }
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
  }, [handleSessionExpired, hasHandledExpiry]);

  const login = async (payload: AuthPayload): Promise<PublicUser> => {
    const result = await authApi.login(payload);
    setUser(result.user);
    setHasHandledExpiry(false);
    return result.user;
  };

  const register = async (payload: RegisterPayload): Promise<PublicUser> => {
    const result = await authApi.register(payload);
    setUser(result.user);
    setHasHandledExpiry(false);
    return result.user;
  };

  const logout = async (): Promise<void> => {
    await authApi.logout();
    clearCsrfToken();
    setUser(null);
    setHasHandledExpiry(false);
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshSession,
      setUser,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
