import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../features/auth";
import { useWorkspace } from "../../features/workspace";
import { useTheme } from "../../theme/useTheme";
import { Drawer } from "../feedback/Feedback";
import { Button } from "../forms/Button";
import styles from "./app-layout.module.css";

export const AppShell = ({ children }: { children: ReactNode }): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useTheme();
  const { user, logout } = useAuth();
  const { activeWorkspaceId, setActiveWorkspaceId, workspaces } = useWorkspace();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const userInitials = `${user?.firstName?.[0] ?? "U"}${user?.lastName?.[0] ?? ""}`;
  const navItems = [
    { to: "/app/overview", label: "Overview", icon: "OV" },
    { to: "/app/workspaces", label: "Workspaces", icon: "WS" },
    activeWorkspaceId
      ? {
          to: `/app/workspaces/${activeWorkspaceId}/aws-accounts`,
          label: "AWS Accounts",
          icon: "AWS",
        }
      : null,
    activeWorkspaceId
      ? { to: `/app/workspaces/${activeWorkspaceId}/costs/summary`, label: "Costs", icon: "CT" }
      : null,
    activeWorkspaceId
      ? { to: `/app/workspaces/${activeWorkspaceId}/alerts`, label: "Alerts", icon: "AL" }
      : null,
    { to: "/app/notifications", label: "Notifications", icon: "NT" },
    { to: "/app/settings/profile", label: "Settings", icon: "ST" },
  ].filter(Boolean) as Array<{ to: string; label: string; icon: string }>;

  useEffect(() => {
    setIsNavOpen(false);
  }, [location.pathname]);

  const sidebarContent = (
    <>
      <div className={styles.brandBlock}>
        <div className={styles.brandIcon}>UF</div>
        <div>
          <p className={styles.brandTitle}>Underflow</p>
          <p className={styles.brandMeta}>AWS Infrastructure</p>
        </div>
      </div>
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              [styles.navLink, isActive && styles.navLinkActive].filter(Boolean).join(" ")
            }
            key={item.to}
            to={item.to}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.sidebarFooter}>
        <a className={styles.footerLink} href="#">
          <span className={styles.navIcon}>SP</span>
          Support
        </a>
        <a className={styles.footerLink} href="#">
          <span className={styles.navIcon}>DC</span>
          Documentation
        </a>
        <button
          className={styles.footerLink}
          onClick={() => void logout()}
          style={{ border: 0, background: "transparent", textAlign: "left" }}
          type="button"
        >
          <span className={styles.navIcon}>LO</span>
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>{sidebarContent}</aside>
      {isNavOpen ? (
        <Drawer onClose={() => setIsNavOpen(false)}>
          <div className={styles.mobileDrawer}>{sidebarContent}</div>
        </Drawer>
      ) : null}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarInner}>
            <div className={styles.topbarLeading}>
              <button
                aria-label="Open navigation"
                className={styles.mobileMenuButton}
                onClick={() => setIsNavOpen(true)}
                type="button"
              >
                Menu
              </button>
              <div className={styles.workspacePill}>
                <span>WS</span>
                <select
                  className={styles.workspaceSelect}
                  onChange={(event) => {
                    if (!event.target.value) {
                      return;
                    }

                    setActiveWorkspaceId(event.target.value);
                    navigate(`/app/workspaces/${event.target.value}`);
                  }}
                  value={activeWorkspaceId ?? ""}
                >
                  {workspaces.length === 0 ? <option value="">No workspaces yet</option> : null}
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
                <span>Open</span>
              </div>
            </div>
            <div className={styles.topbarActions}>
              <div className={styles.iconCluster}>
                <button className={styles.iconButton} type="button">
                  NT
                </button>
                <button className={styles.iconButton} type="button">
                  CM
                </button>
              </div>
              <div className={styles.divider} />
              <div className={styles.themeGroup}>
                {[
                  ["light", "Light"],
                  ["dark", "Dark"],
                  ["system", "System"],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    onClick={() => setMode(value as "light" | "dark" | "system")}
                    size="sm"
                    variant={mode === value ? "primary" : "ghost"}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className={styles.userBlock}>
                <div className={styles.userText}>
                  <p className={styles.userName}>
                    {user ? `${user.firstName} ${user.lastName}` : "Alex Rivera"}
                  </p>
                  <p className={styles.userRole}>Cloud Architect</p>
                </div>
                <div className={styles.avatar}>{userInitials}</div>
              </div>
            </div>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};
