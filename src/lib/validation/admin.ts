import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";

export const ROLE_VALUES = ["STUDENT", "STAFF", "ADMIN"] as const;

const optionalTrimmedString = z.string().trim().min(1).nullable().optional();

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, "Bitte Vorname angeben."),
  lastName: z.string().trim().min(1, "Bitte Nachname angeben."),
  email: z.email("Bitte eine gültige E-Mail-Adresse angeben."),
  role: z.enum(ROLE_VALUES),
  schoolClass: optionalTrimmedString,
  room: optionalTrimmedString,
  residentialAreaId: optionalTrimmedString,
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().trim().min(1, "Bitte Vorname angeben."),
  lastName: z.string().trim().min(1, "Bitte Nachname angeben."),
  email: z.email("Bitte eine gültige E-Mail-Adresse angeben."),
  schoolClass: optionalTrimmedString,
  room: optionalTrimmedString,
  residentialAreaId: optionalTrimmedString,
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const changeUserRoleSchema = z.object({
  id: z.string().min(1),
  role: z.enum(ROLE_VALUES),
});
export type ChangeUserRoleInput = z.infer<typeof changeUserRoleSchema>;

export const residentialAreaSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Bitte einen Namen angeben."),
});
export type ResidentialAreaInput = z.infer<typeof residentialAreaSchema>;

/**
 * PROMPT.md Abschnitt 4 ("Settings mit Defaults") — dieselben Felder wie
 * `AppSettings` (src/lib/settings.ts), hier als Zod-Schema für die
 * Einstellungen-Server-Action. `curfewTime` als "HH:MM" (24h) validiert.
 */
export const settingsSchema = z.object({
  requireExtensionApproval: z.boolean(),
  reminderMinutesBefore: z.coerce.number().int().min(1).max(1440),
  overdueGraceMinutes: z.coerce.number().int().min(0).max(1440),
  maxPlannedDurationHours: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 14),
  curfewTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format HH:MM, z. B. 22:00."),
  dataRetentionMonths: z.coerce.number().int().min(1).max(120),
});
export type SettingsInput = z.infer<typeof settingsSchema>;
