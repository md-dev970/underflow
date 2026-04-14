export interface ThemePalette {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceRaised: string;
  surfaceOverlay: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  shadow: string;
  overlay: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  chart6: string;
}

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "underflow-theme";

export const themeVariableMap: Record<keyof ThemePalette, string> = {
  background: "--color-background",
  surface: "--color-surface",
  surfaceMuted: "--color-surface-muted",
  surfaceRaised: "--color-surface-raised",
  surfaceOverlay: "--color-surface-overlay",
  border: "--color-border",
  borderStrong: "--color-border-strong",
  text: "--color-text",
  textMuted: "--color-text-muted",
  textSubtle: "--color-text-subtle",
  primary: "--color-primary",
  primaryHover: "--color-primary-hover",
  secondary: "--color-secondary",
  accent: "--color-accent",
  success: "--color-success",
  warning: "--color-warning",
  danger: "--color-danger",
  info: "--color-info",
  shadow: "--color-shadow",
  overlay: "--color-overlay",
  chart1: "--color-chart-1",
  chart2: "--color-chart-2",
  chart3: "--color-chart-3",
  chart4: "--color-chart-4",
  chart5: "--color-chart-5",
  chart6: "--color-chart-6",
};
