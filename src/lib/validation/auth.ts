import { z } from "zod";

// Gemeinsame Zod-Schemas für Client (react-hook-form + zodResolver) und
// Server Actions (src/actions/auth.ts) — eine einzige Quelle der Wahrheit für
// die Validierungsregeln, keine Duplikation zwischen Formular und Action.

export const MIN_PASSWORD_LENGTH = 8;

export const loginSchema = z.object({
  email: z.email("Bitte eine gültige E-Mail-Adresse angeben."),
  password: z.string().min(1, "Bitte Passwort angeben."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.email("Bitte eine gültige E-Mail-Adresse angeben."),
});
export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Die Passwörter stimmen nicht überein.",
    path: ["passwordConfirm"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
