"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * Minimales Bottom-Sheet-Modal (PROMPT.md Abschnitt 7: "Tap öffnet ein
 * Bottom-Sheet-Formular"). Kein Radix-Dialog, da `ui.shadcn.com`/npm-Pakete
 * dafür in dieser Umgebung nicht immer erreichbar sind (siehe
 * docs/decisions.md) — stattdessen ein selbst geschriebenes, aber
 * funktionales Modal mit Escape-/Backdrop-Schließen und `role="dialog"`.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="animate-in fade-in absolute inset-0 bg-black/40 duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 bg-background relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-6 shadow-lg duration-200 sm:rounded-2xl"
        style={{
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="hover:bg-accent -m-2 rounded-full p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
