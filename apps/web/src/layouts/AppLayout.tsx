import { Outlet } from "react-router-dom";

import { AppShell } from "../components/navigation/AppShell";

export const AppLayout = (): JSX.Element => (
  <AppShell>
    <Outlet />
  </AppShell>
);
