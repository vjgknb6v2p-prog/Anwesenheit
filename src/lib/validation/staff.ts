import { z } from "zod";

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
