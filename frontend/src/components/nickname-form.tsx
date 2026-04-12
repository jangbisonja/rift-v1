"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateNickname } from "@/lib/api/client";
import { NicknameSchema, NicknameFormValues } from "@/lib/schemas";

interface NicknameFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function NicknameForm({ onSuccess, onCancel }: NicknameFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [cooldownSecs, setCooldownSecs] = useState<number | null>(null);

  const form = useForm<NicknameFormValues>({
    resolver: zodResolver(NicknameSchema),
    defaultValues: { nickname: "" },
  });

  // Countdown timer for NICKNAME_COOLDOWN errors
  useEffect(() => {
    if (cooldownSecs === null || cooldownSecs <= 0) return;
    const timer = setInterval(() => {
      setCooldownSecs((s) => {
        if (s === null || s <= 1) {
          clearInterval(timer);
          return null;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSecs]);

  async function onSubmit(values: NicknameFormValues) {
    setServerError(null);
    try {
      await updateNickname(values.nickname);
      onSuccess();
    } catch (err: unknown) {
      // Parse error codes from backend
      const detail = (err as { detail?: unknown })?.detail;
      if (detail && typeof detail === "object" && !Array.isArray(detail)) {
        const d = detail as { code?: string; message?: string; seconds_remaining?: number };
        if (d.code === "NICKNAME_COOLDOWN" && d.seconds_remaining) {
          setCooldownSecs(d.seconds_remaining);
          setServerError(`Подождите ${d.seconds_remaining} сек. перед сменой никнейма.`);
        } else if (d.code === "NICKNAME_TAKEN") {
          setServerError("Этот никнейм уже занят.");
        } else if (d.code === "NICKNAME_PROHIBITED") {
          setServerError("Этот никнейм недоступен.");
        } else {
          setServerError(d.message ?? "Произошла ошибка.");
        }
      } else {
        setServerError("Произошла ошибка.");
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1">
        <input
          {...form.register("nickname")}
          placeholder="Никнейм"
          autoComplete="off"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {form.formState.errors.nickname && (
          <p className="text-xs text-destructive">
            {form.formState.errors.nickname.message}
          </p>
        )}
        {serverError && (
          <p className="text-xs text-destructive">{serverError}</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={form.formState.isSubmitting || cooldownSecs !== null}
          className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cooldownSecs !== null ? `Подождите ${cooldownSecs}с` : "Сохранить"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-input px-3 py-2 text-sm hover:bg-muted"
          >
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}
