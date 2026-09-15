"use client";

import { Bell, CalendarClock, Home, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Start", icon: Home },
  { href: "/abwesenheiten", label: "Historie", icon: CalendarClock },
  { href: "/benachrichtigungen", label: "Nachrichten", icon: Bell },
  { href: "/profil", label: "Profil", icon: User },
] as const;

/**
 * PROMPT.md Abschnitt 6: Bottom-Tab-Navigation mit 4 Einträgen für Schüler.
 * `env(safe-area-inset-bottom)` sorgt für ausreichend Abstand auf Geräten
 * mit Home-Indicator (Abschnitt 7). `unreadCount` (Abschnitt 8: "Glocke mit
 * Badge") wird serverseitig im Layout ermittelt und hier nur angezeigt.
 */
export function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav
      className="bg-background/95 fixed inset-x-0 bottom-0 z-40 flex border-t backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        const showBadge = href === "/benachrichtigungen" && unreadCount > 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 py-2 text-xs",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <span className="relative">
              <Icon className="h-5 w-5" aria-hidden="true" />
              {showBadge && (
                <span
                  aria-hidden="true"
                  className="bg-status-absent text-status-absent-foreground absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            <span>
              {label}
              {showBadge && (
                <span className="sr-only"> ({unreadCount} ungelesen)</span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
