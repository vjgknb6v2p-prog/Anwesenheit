"use server";

import { requireRole } from "@/lib/authz";
import {
  getLiveOverviewSnapshot,
  type LiveOverviewSnapshot,
} from "@/lib/admin-queries";

/**
 * Fallback-Polling für die Admin-Live-Übersicht (CLAUDE.md: "SSE, Fallback
 * Polling alle 30 s"). Der Client ruft dies zusätzlich zur SSE-Verbindung in
 * einem 30-Sekunden-Intervall auf — ein reiner Sicherheitsnetz, falls die
 * EventSource-Verbindung (Proxy, Firewall, o. Ä.) unbemerkt stehen bleibt.
 */
export async function getLiveOverviewSnapshotAction(): Promise<LiveOverviewSnapshot> {
  await requireRole("ADMIN");
  return getLiveOverviewSnapshot();
}
