import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  BookOpenText,
  BriefcaseBusiness,
  CloudCog,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  ReceiptText,
  Settings,
  ShieldHalf,
  Sun,
  WalletCards,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../features/auth";
import { useWorkspace } from "../../features/workspace";
import type { ThemeMode } from "../../theme/tokens";
import { useTheme } from "../../theme/useTheme";
import { Drawer } from "../feedback/Feedback";
import styles from "./app-layout.module.css";

export const AppShell = ({ children }: { children: ReactNode }): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useTheme();
  const { user, logout } = useAuth();
  const { activeWorkspaceId, setActiveWorkspaceId, workspaces } = useWorkspace();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const userInitials = `${user?.firstName?.[0] ?? "U"}${user?.lastName?.[0] ?? ""}`;
  const themeOrder: ThemeMode[] = ["light", "dark", "system"];
  const themeMeta: Record<ThemeMode, { label: string; icon: typeof Sun }> = {
    light: { label: "Light mode", icon: Sun },
    dark: { label: "Dark mode", icon: Moon },
    system: { label: "System theme", icon: Monitor },
  };
  const navItems = [
    { to: "/app/overview", label: "Overview", icon: LayoutDashboard },
    { to: "/app/workspaces", label: "Workspaces", icon: BriefcaseBusiness },
    activeWorkspaceId
      ? {
          to: `/app/workspaces/${activeWorkspaceId}/aws-accounts`,
          label: "AWS Accounts",
          icon: CloudCog,
        }
      : null,
    activeWorkspaceId
      ? { to: `/app/workspaces/${activeWorkspaceId}/costs/summary`, label: "Costs", icon: WalletCards }
      : null,
    activeWorkspaceId
      ? { to: `/app/workspaces/${activeWorkspaceId}/alerts`, label: "Alerts", icon: Bell }
      : null,
    { to: "/app/notifications", label: "Notifications", icon: ReceiptText },
    { to: "/app/settings/profile", label: "Settings", icon: Settings },
  ].filter(Boolean) as Array<{
    to: string;
    label: string;
    icon: typeof LayoutDashboard;
  }>;

  useEffect(() => {
    setIsNavOpen(false);
  }, [location.pathname]);

  const currentThemeIndex = Math.max(themeOrder.indexOf(mode), 0);
  const nextTheme = themeOrder[(currentThemeIndex + 1) % themeOrder.length] ?? "light";
  const ThemeIcon = themeMeta[mode].icon;

  const sidebarContent = (
    <>
      <div className={styles.brandBlock}>
        <div className={styles.brandIcon}>
          <CloudCog size={20} strokeWidth={2.2} />
        </div>
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
            <span className={styles.navIcon}>
              <item.icon size={18} strokeWidth={2.2} />
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.sidebarFooter}>
        <a className={styles.footerLink} href="#">
          <span className={styles.navIcon}>
            <ShieldHalf size={18} strokeWidth={2.2} />
          </span>
          Support
        </a>
        <a className={styles.footerLink} href="#">
          <span className={styles.navIcon}>
            <BookOpenText size={18} strokeWidth={2.2} />
          </span>
          Documentation
        </a>
        <button
          className={styles.footerLink}
          onClick={() => void logout()}
          style={{ border: 0, background: "transparent", textAlign: "left" }}
          type="button"
        >
          <span className={styles.navIcon}>
            <LogOut size={18} strokeWidth={2.2} />
          </span>
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
                <BriefcaseBusiness size={16} strokeWidth={2.2} />
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
                <button
                  aria-label="Open notifications"
                  className={styles.iconButton}
                  onClick={() => navigate("/app/notifications")}
                  type="button"
                >
                  <Bell size={18} strokeWidth={2.2} />
                </button>
                <button
                  aria-label="Open cost monitor"
                  className={styles.iconButton}
                  disabled={!activeWorkspaceId}
                  onClick={() => {
                    if (!activeWorkspaceId) {
                      return;
                    }

                    navigate(`/app/workspaces/${activeWorkspaceId}/costs/summary`);
                  }}
                  type="button"
                >
                  <WalletCards size={18} strokeWidth={2.2} />
                </button>
              </div>
              <div className={styles.divider} />
              <button
                aria-label={`${themeMeta[mode].label}. Switch to ${themeMeta[nextTheme].label.toLowerCase()}`}
                className={styles.themeToggle}
                onClick={() => setMode(nextTheme)}
                title={`${themeMeta[mode].label} active`}
                type="button"
              >
                <ThemeIcon size={18} strokeWidth={2.2} />
              </button>
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
