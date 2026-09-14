"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "checkin-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme !== "system") {
    root.classList.add(theme);
  }
}

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Hell" },
  { value: "system", label: "System" },
  { value: "dark", label: "Dunkel" },
];

/**
 * PROMPT.md Abschnitt 7: "Dark Mode über prefers-color-scheme + manueller
 * Toggle." Der manuelle Toggle wird per `localStorage` gemerkt (rein
 * clientseitige Präferenz, siehe Anti-FOUC-Script in src/app/layout.tsx).
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        setTheme(stored);
      }
    } catch {
      // localStorage evtl. nicht verfügbar (privates Fenster) — Standard bleibt "system".
    }
  }, []);

  function handleChange(next: Theme) {
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Präferenz gilt dann nur für die aktuelle Sitzung.
    }
  }

  return (
    <div className="flex gap-2">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={theme === option.value ? "default" : "outline"}
          onClick={() => handleChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
