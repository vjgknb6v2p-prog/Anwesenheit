import { db } from "@/lib/db";

/**
 * PROMPT.md Abschnitt 4: "Settings mit Defaults". Die `Setting`-Tabelle
 * enthält beliebige Json-Werte je Key; diese Funktion liefert sie typisiert
 * und fällt auf die vorgegebenen Defaults zurück, falls ein Key (noch) nicht
 * in der DB existiert.
 */
export interface AppSettings {
  requireExtensionApproval: boolean;
  reminderMinutesBefore: number;
  overdueGraceMinutes: number;
  maxPlannedDurationHours: number;
  curfewTime: string;
  /** PROMPT.md Abschnitt 9 (Phase 7): Aufbewahrungsfrist für den
   * Hard-Delete-Job (/api/v1/cron/cleanup), Default 12 Monate. */
  dataRetentionMonths: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  requireExtensionApproval: false,
  reminderMinutesBefore: 30,
  overdueGraceMinutes: 10,
  maxPlannedDurationHours: 72,
  curfewTime: "22:00",
  dataRetentionMonths: 12,
};

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.setting.findMany();
  const overrides = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return { ...DEFAULT_SETTINGS, ...overrides } as AppSettings;
}
