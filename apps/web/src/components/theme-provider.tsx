import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "oi-theme";

interface ThemeCtx {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

const readStored = (): Theme => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
};

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStored);
  const [isSystemDark, setSystemDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved = theme === "system" ? (isSystemDark ? "dark" : "light") : theme;

  const first = useRef(true);
  useEffect(() => {
    const root = document.documentElement;
    // Ease the brightness change instead of flashing (skipped on first paint and for reduced motion).
    const animate = !first.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    first.current = false;
    if (animate) root.classList.add("theme-transition");
    root.classList.toggle("dark", resolved === "dark");
    if (!animate) return;
    const t = setTimeout(() => root.classList.remove("theme-transition"), 320);
    return () => clearTimeout(t);
  }, [resolved]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  };

  return <Ctx.Provider value={{ theme, resolved, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
};
