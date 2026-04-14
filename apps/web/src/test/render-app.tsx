import type { PropsWithChildren, ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AppRouter } from "../routes/AppRouter";
import { AuthProvider } from "../features/auth";
import { ToastProvider } from "../features/toast";
import { WorkspaceProvider } from "../features/workspace";
import { ThemeProvider } from "../theme/ThemeProvider";

export const AppTestProviders = ({
  children,
  initialEntries = ["/"],
}: PropsWithChildren<{ initialEntries?: string[] }>): JSX.Element => (
  <ThemeProvider>
    <ToastProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>
          <WorkspaceProvider>{children}</WorkspaceProvider>
        </AuthProvider>
      </MemoryRouter>
    </ToastProvider>
  </ThemeProvider>
);

export const renderApp = (initialEntries: string[] = ["/"]) =>
  render(
    <AppTestProviders initialEntries={initialEntries}>
      <AppRouter />
    </AppTestProviders>,
  );

export const renderWithAppProviders = (ui: ReactElement, initialEntries: string[] = ["/"]) =>
  render(<AppTestProviders initialEntries={initialEntries}>{ui}</AppTestProviders>);
