"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { resetPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ResetPasswordInput,
  resetPasswordSchema,
} from "@/lib/validation/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    const result = await resetPasswordAction(values);
    if (result?.error) {
      setServerError(result.error);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-sm flex-col gap-4"
      noValidate
    >
      <input type="hidden" {...register("token")} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Neues Passwort</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-destructive text-sm">{errors.password.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="passwordConfirm">Passwort bestätigen</Label>
        <Input
          id="passwordConfirm"
          type="password"
          autoComplete="new-password"
          {...register("passwordConfirm")}
        />
        {errors.passwordConfirm && (
          <p className="text-destructive text-sm">
            {errors.passwordConfirm.message}
          </p>
        )}
      </div>
      {serverError && (
        <p role="alert" className="text-destructive text-sm">
          {serverError}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Wird gespeichert…" : "Passwort speichern"}
      </Button>
    </form>
  );
}
