import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { darkPalette } from "./palettes/dark";
import { lightPalette } from "./palettes/light";
import {
  THEME_STORAGE_KEY,
  themeVariableMap,
  type ResolvedTheme,
  type ThemeMode,
} from "./tokens";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const getInitialMode = (): ThemeMode => {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }

  const fallback = import.meta.env.VITE_DEFAULT_THEME;
  return fallback === "light" || fallback === "dark" ? fallback : "system";
};

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const ThemeProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [mode, setMode] = useState<ThemeMode>(() => getInitialMode());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      setSystemTheme(media.matches ? "dark" : "light");
    };

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const resolvedTheme: ResolvedTheme = mode === "system" ? systemTheme : mode;

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    const body = document.body;
    const palette = resolvedTheme === "dark" ? darkPalette : lightPalette;

    body.dataset.theme = resolvedTheme;

    (Object.keys(themeVariableMap) as Array<keyof typeof themeVariableMap>).forEach(
      (token) => {
        body.style.setProperty(themeVariableMap[token], palette[token]);
      },
    );
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      setMode,
    }),
    [mode, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
