// Client-safe theme store (zero imports except react — never import
// server libs here; pages import this like toast/module-gate).
// Dark is the default; light is opt-in via the Shell toggle, persisted
// in localStorage, applied as <html class="light"> + colorScheme.
import { useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "shell-theme";

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(t: Theme): void {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* private mode */
  }
  document.documentElement.classList.toggle("light", t === "light");
  document.documentElement.style.colorScheme = t;
  window.dispatchEvent(new CustomEvent<Theme>("theme-change", { detail: t }));
}

// Shell toggle state: syncs from storage on mount, follows toggles.
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const t = getTheme();
    document.documentElement.classList.toggle("light", t === "light");
    document.documentElement.style.colorScheme = t;
    setTheme(t);
    const onChange = (e: Event) => setTheme((e as CustomEvent<Theme>).detail ?? getTheme());
    window.addEventListener("theme-change", onChange);
    return () => window.removeEventListener("theme-change", onChange);
  }, []);
  return [theme, (t) => { setTheme(t); applyTheme(t); }];
}

// Re-render trigger for canvas charts (Chart.js colors are config-time).
export function useThemeTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const f = () => setTick((t) => t + 1);
    window.addEventListener("theme-change", f);
    return () => window.removeEventListener("theme-change", f);
  }, []);
  return tick;
}

// Chart.js palette: call at render/effect time (reads live DOM class).
export function chartTheme(): { tick: string; grid: string; label: string } {
  try {
    if (document.documentElement.classList.contains("light"))
      return { tick: "#52525b", grid: "#e4e4e7", label: "#27272a" };
  } catch {
    /* ssr */
  }
  return { tick: "#999999", grid: "#27272a", label: "#eeeeee" };
}
