import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "../features/auth";
import { ToastProvider } from "../features/toast";
import { WorkspaceProvider } from "../features/workspace";
import { AppRouter } from "../routes/AppRouter";
import { ThemeProvider } from "../theme/ThemeProvider";

export const App = (): JSX.Element => (
  <ThemeProvider>
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <AppRouter />
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  </ThemeProvider>
);
