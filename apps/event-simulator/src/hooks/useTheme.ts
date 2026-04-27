import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "seeder-theme";

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // storage unavailable (e.g. test environment or private browsing)
  }
}

function getSystemPreference(): Theme {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function getInitialTheme(): Theme {
  const stored = readStorage();
  if (stored === "dark" || stored === "light") return stored;
  return getSystemPreference();
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    writeStorage(theme);
  }, [theme]);

  // Sync with system preference changes only when no explicit choice stored
  useEffect(() => {
    try {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        if (!readStorage()) {
          setThemeState(e.matches ? "dark" : "light");
        }
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } catch {
      // matchMedia unavailable
    }
  }, []);

  function toggleTheme() {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }

  return { theme, toggleTheme };
}
