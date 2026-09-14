import type { Metadata } from "next";
import { requireRole } from "@/lib/authz";
import { getSettings } from "@/lib/settings";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = {
  title: "Einstellungen – CheckIn",
};

export default async function AdminSettingsPage() {
  await requireRole("ADMIN");
  const settings = await getSettings();
  return <SettingsClient settings={settings} />;
}
