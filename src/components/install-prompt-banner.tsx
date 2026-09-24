"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "checkin-install-dismissed";

/** Noch nicht Teil von `lib.dom.d.ts` — minimaler eigener Typ statt `any`. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

/**
 * PROMPT.md Abschnitt 8: "Auf iOS funktioniert Push nur, wenn die PWA zum
 * Home-Bildschirm hinzugefügt wurde ... Baue dafür einen Hinweis-Banner mit
 * Anleitung ein, statt Push als selbstverständlich anzunehmen." iOS feuert
 * kein `beforeinstallprompt` — dort wird stattdessen immer die
 * Anleitung gezeigt (solange nicht bereits installiert). Auf
 * Android/Desktop-Chrome nur, wenn der Browser den nativen Install-Prompt
 * tatsächlich anbietet.
 */
export function InstallPromptBanner() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setStandalone(isStandalone());
    setIos(isIos());
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
    setReady(true);

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Präferenz gilt dann nur für die aktuelle Sitzung.
    }
  }

  async function handleInstallClick() {
    if (!deferredPrompt) {
      return;
    }
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
    dismiss();
  }

  if (!ready || standalone || dismissed) {
    return null;
  }
  if (!ios && !deferredPrompt) {
    return null;
  }

  return (
    <div className="border-status-info animate-in fade-in slide-in-from-top-2 flex flex-col gap-2 rounded-2xl border p-4 shadow-sm duration-300">
      {ios ? (
        <p className="text-sm">
          Für Push-Benachrichtigungen auf dem iPhone: Tippe unten in Safari auf{" "}
          <strong>Teilen</strong> und dann auf{" "}
          <strong>Zum Home-Bildschirm</strong>.
        </p>
      ) : (
        <>
          <p className="text-sm">
            Installiere CheckIn als App für schnelleren Zugriff.
          </p>
          <Button
            type="button"
            size="sm"
            className="self-start"
            onClick={handleInstallClick}
          >
            Installieren
          </Button>
        </>
      )}
      <button
        type="button"
        onClick={dismiss}
        className="text-muted-foreground self-end text-xs underline underline-offset-2"
      >
        Nicht mehr anzeigen
      </button>
    </div>
  );
}
