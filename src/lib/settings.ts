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
}

const DEFAULT_SETTINGS: AppSettings = {
  requireExtensionApproval: false,
  reminderMinutesBefore: 30,
  overdueGraceMinutes: 10,
  maxPlannedDurationHours: 72,
  curfewTime: "22:00",
};

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.setting.findMany();
  const overrides = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return { ...DEFAULT_SETTINGS, ...overrides } as AppSettings;
}
