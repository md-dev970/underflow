import { Monitor, Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import type { PropsWithChildren } from "react";

import { Button } from "../../components/forms/Button";
import { appConfig } from "../../lib/config";
import type { ThemeMode } from "../../theme/tokens";
import { useTheme } from "../../theme/useTheme";

interface AuthPageFrameProps extends PropsWithChildren {
  asideBody: string;
  asideTitle: string;
}

export const AuthPageFrame = ({
  asideBody,
  asideTitle,
  children,
}: AuthPageFrameProps): JSX.Element => {
  const { mode, setMode } = useTheme();
  const themeOrder: ThemeMode[] = ["light", "dark", "system"];
  const themeMeta: Record<ThemeMode, { label: string; icon: typeof Sun }> = {
    light: { label: "Light mode", icon: Sun },
    dark: { label: "Dark mode", icon: Moon },
    system: { label: "System theme", icon: Monitor },
  };
  const currentThemeIndex = Math.max(themeOrder.indexOf(mode), 0);
  const nextTheme = themeOrder[(currentThemeIndex + 1) % themeOrder.length] ?? "light";
  const ThemeIcon = themeMeta[mode].icon;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background)",
      }}
    >
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          backdropFilter: "blur(16px)",
          background: "color-mix(in srgb, var(--color-surface) 78%, transparent)",
          borderBottom: "1px solid color-mix(in srgb, var(--color-border) 72%, transparent)",
        }}
      >
        <div
          style={{
            width: "min(1240px, calc(100% - 2rem))",
            margin: "0 auto",
            minHeight: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            padding: "0.75rem 0",
          }}
        >
          <Link
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.65rem",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "var(--color-text)",
            }}
            to="/"
          >
            {appConfig.appName}
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <button
              aria-label={`${themeMeta[mode].label}. Switch to ${themeMeta[nextTheme].label.toLowerCase()}`}
              onClick={() => setMode(nextTheme)}
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "999px",
                border: "1px solid color-mix(in srgb, var(--color-border) 70%, transparent)",
                background: "color-mix(in srgb, var(--color-surface-muted) 78%, white)",
                color: "var(--color-text)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title={`${themeMeta[mode].label} active`}
              type="button"
            >
              <ThemeIcon size={18} strokeWidth={2.2} />
            </button>
            <Link style={{ color: "var(--color-text-muted)", fontWeight: 700 }} to="/login">
              Login
            </Link>
            <Link to="/signup">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div style={{ width: "min(1240px, calc(100% - 2rem))", margin: "0 auto", padding: "2rem 0" }}>
        <div className="twoColumn sectionSurface" style={{ overflow: "hidden" }}>
          {children}
          <div
            style={{
              padding: "2rem",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 85%, black), color-mix(in srgb, var(--color-secondary) 58%, black))",
              color: "white",
              display: "grid",
              gap: "1rem",
              alignContent: "center",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "2rem" }}>{asideTitle}</h2>
            <p style={{ opacity: 0.85 }}>{asideBody}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
