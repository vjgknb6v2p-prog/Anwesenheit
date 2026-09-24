import { z } from "zod";
import { ABSENCE_REASONS } from "@/domain/absence-reason";

/**
 * PROMPT.md Abschnitt 3.3: "plannedReturnAt muss in der Zukunft liegen, max.
 * 14 Tage voraus." Das ist die feste, immer geltende Obergrenze. Das
 * konfigurierbare, meist engere Setting `maxPlannedDurationHours` wird
 * zusätzlich in der Server Action geprüft (dort ist die aktuelle
 * DB-Einstellung bekannt) — siehe src/actions/absences.ts.
 */
export const MAX_PLANNED_DAYS_AHEAD = 14;

export const checkOutSchema = z
  .object({
    reason: z.enum(ABSENCE_REASONS),
    reasonDetail: z.string().trim().max(200).optional(),
    destination: z.string().trim().min(1, "Bitte ein Ziel angeben.").max(200),
    plannedReturnAt: z.coerce.date({
      error: "Bitte eine geplante Rückkehr angeben.",
    }),
    note: z.string().trim().max(500).optional(),
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
export type CheckOutInput = z.infer<typeof checkOutSchema>;

export const extendSchema = z.object({
  newReturnAt: z.coerce.date({ error: "Bitte eine neue Rückkehr angeben." }),
});
export type ExtendInput = z.infer<typeof extendSchema>;
