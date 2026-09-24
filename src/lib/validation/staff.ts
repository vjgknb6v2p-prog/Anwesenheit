import { z } from "zod";
import { ABSENCE_REASONS } from "@/domain/absence-reason";
import { MAX_PLANNED_DAYS_AHEAD } from "@/lib/validation/absence";

/**
 * PROMPT.md Abschnitt 3.6: Mitarbeiter dürfen `checkedOutAt`, `plannedReturnAt`
 * und `checkedInAt` korrigieren. `checkedInAt` ist explizit nullbar, damit ein
 * Mitarbeiter eine fälschlich eingetragene Rückkehr auch wieder entfernen kann
 * (die Absence wird dadurch wieder aktiv — siehe src/actions/staff.ts).
 */
export const correctAbsenceSchema = z
  .object({
    absenceId: z.string().min(1),
    checkedOutAt: z.coerce.date({ error: "Bitte eine Auscheckzeit angeben." }),
    plannedReturnAt: z.coerce.date({
      error: "Bitte eine geplante Rückkehr angeben.",
    }),
    checkedInAt: z.coerce.date().nullable(),
  })
  .refine(
    (data) => data.plannedReturnAt.getTime() > data.checkedOutAt.getTime(),
    {
      message: "Die geplante Rückkehr muss nach der Auscheckzeit liegen.",
      path: ["plannedReturnAt"],
    },
  )
  .refine(
    (data) =>
      !data.checkedInAt ||
      data.checkedInAt.getTime() >= data.checkedOutAt.getTime(),
    {
      message:
        "Die tatsächliche Rückkehr darf nicht vor der Auscheckzeit liegen.",
      path: ["checkedInAt"],
    },
  );
export type CorrectAbsenceInput = z.infer<typeof correctAbsenceSchema>;

export const decideExtensionSchema = z.object({
  extensionId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});
export type DecideExtensionInput = z.infer<typeof decideExtensionSchema>;

/**
 * Erweiterung "Gruppen-Sammelaktionen": ein Mitarbeiter checkt mehrere
 * Schüler gemeinsam aus (z. B. Wandertag/Kursfahrt) — dieselben Regeln wie
 * beim einzelnen Auschecken (Abschnitt 3.3), nur für eine Liste von
 * Schüler-IDs statt des angemeldeten Nutzers.
 */
export const bulkCheckOutSchema = z
  .object({
    studentIds: z
      .array(z.string().min(1))
      .min(1, "Bitte mindestens einen Schüler auswählen."),
    reason: z.enum(ABSENCE_REASONS),
    reasonDetail: z.string().trim().max(200).optional(),
    destination: z.string().trim().min(1, "Bitte ein Ziel angeben.").max(200),
    plannedReturnAt: z.coerce.date({
      error: "Bitte eine geplante Rückkehr angeben.",
    }),
  })
  .refine((data) => data.reason !== "SONSTIGES" || !!data.reasonDetail, {
    message: "Bitte einen Grund angeben.",
    path: ["reasonDetail"],
  })
  .refine((data) => data.plannedReturnAt.getTime() > Date.now(), {
    message: "Die geplante Rückkehr muss in der Zukunft liegen.",
    path: ["plannedReturnAt"],
  })
  .refine(
    (data) =>
      data.plannedReturnAt.getTime() <=
      Date.now() + MAX_PLANNED_DAYS_AHEAD * 24 * 60 * 60 * 1000,
    {
      message: `Die geplante Rückkehr darf höchstens ${MAX_PLANNED_DAYS_AHEAD} Tage in der Zukunft liegen.`,
      path: ["plannedReturnAt"],
    },
  );
export type BulkCheckOutInput = z.infer<typeof bulkCheckOutSchema>;

export const bulkCheckInSchema = z.object({
  studentIds: z
    .array(z.string().min(1))
    .min(1, "Bitte mindestens einen Schüler auswählen."),
});
export type BulkCheckInInput = z.infer<typeof bulkCheckInSchema>;
