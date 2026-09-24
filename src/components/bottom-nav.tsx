"use client";

import { Bell, CalendarClock, Home, MessageCircle, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type BadgeKey = "notifications" | "messages" | null;

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  badge: BadgeKey;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Start", icon: Home, badge: null },
  {
    href: "/abwesenheiten",
    label: "Historie",
    icon: CalendarClock,
    badge: null,
  },
  {
    href: "/nachrichten",
    label: "Nachrichten",
    icon: MessageCircle,
    badge: "messages",
  },
  {
    href: "/benachrichtigungen",
    label: "Hinweise",
    icon: Bell,
    badge: "notifications",
  },
  { href: "/profil", label: "Profil", icon: User, badge: null },
];

/**
 * PROMPT.md Abschnitt 6 (erweitert um die Nachrichten-Funktion): Bottom-Tab-
 * Navigation mit 5 Einträgen für Schüler. `env(safe-area-inset-bottom)`
 * sorgt für ausreichend Abstand auf Geräten mit Home-Indicator
 * (Abschnitt 7). Zwei getrennte Badges: "Hinweise" (Bell) für System-
 * Benachrichtigungen (Erinnerungen/Überfälligkeit), "Nachrichten"
 * (MessageCircle) für echte Direktnachrichten/Rundrufe zwischen Personen.
 */
export function BottomNav({
  unreadNotifications = 0,
  unreadMessages = 0,
}: {
  unreadNotifications?: number;
  unreadMessages?: number;
}) {
  const pathname = usePathname();
  const badgeCounts = {
    notifications: unreadNotifications,
    messages: unreadMessages,
  };

  return (
    <nav
      className="bg-background/95 fixed inset-x-0 bottom-0 z-40 flex border-t backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
        const active = pathname === href;
        const count = badge ? badgeCounts[badge] : 0;
        const showBadge = count > 0;
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
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </span>
            <span>
              {label}
              {showBadge && (
                <span className="sr-only"> ({count} ungelesen)</span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
