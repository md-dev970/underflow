import { Outlet } from "react-router-dom";

export const AuthLayout = (): JSX.Element => (
  <main
    className="container"
    style={{
      minHeight: "100vh",
      display: "grid",
      alignItems: "center",
      paddingBlock: "2rem",
    }}
  >
    <Outlet />
  </main>
);
