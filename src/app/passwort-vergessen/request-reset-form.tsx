"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { requestPasswordResetAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type RequestPasswordResetInput,
  requestPasswordResetSchema,
} from "@/lib/validation/auth";

export function RequestResetForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetSchema),
  });

  async function onSubmit(values: RequestPasswordResetInput) {
    await requestPasswordResetAction(values);
    // Bewusst immer dieselbe Erfolgsmeldung, unabhängig davon, ob die
    // E-Mail-Adresse existiert (keine User-Enumeration).
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="max-w-sm text-center text-sm">
        Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail
        mit einem Link zum Zurücksetzen des Passworts verschickt.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-sm flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-destructive text-sm">{errors.email.message}</p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Wird gesendet…" : "Link anfordern"}
      </Button>
    </form>
  );
}
