"use client";

/**
 * Admin page — /mod/timers
 * 2-row × 7-column toggle grid for managing the timer schedule.
 * Fetches via TanStack Query; saves via PUT /timers/schedule.
 * Auth: admin-only (proxy.ts guards /mod/*, RULES.md #A1, #A2).
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTimerSchedule, updateTimerSchedule } from "@/lib/api/client";
import { useToken } from "@/components/mod/token-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** ISO day labels in Russian. Index 0 = Monday, 6 = Sunday. (RULES.md #T3) */
const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

const DEFAULT_SCHEDULE = {
  world_boss: Array(7).fill(false) as boolean[],
  rift: Array(7).fill(false) as boolean[],
};

export default function TimersPage() {
  const token = useToken();
  const qc = useQueryClient();

  const { data: serverSchedule, isLoading, isError, refetch } = useQuery({
    queryKey: ["timer-schedule"],
    queryFn: () => getTimerSchedule(),
  });

  // Local toggle state — initialised from server data once loaded
  const [localSchedule, setLocalSchedule] = useState(DEFAULT_SCHEDULE);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (serverSchedule) {
      setLocalSchedule({
        world_boss: [...serverSchedule.world_boss],
        rift: [...serverSchedule.rift],
      });
    }
  }, [serverSchedule]);

  const saveMut = useMutation({
    mutationFn: () => updateTimerSchedule(localSchedule, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timer-schedule"] });
      setFeedback({ type: "success", message: "Расписание сохранено." });
    },
    onError: () => {
      setFeedback({ type: "error", message: "Ошибка при сохранении. Попробуйте ещё раз." });
    },
  });

  function toggle(type: "world_boss" | "rift", day: number) {
    setLocalSchedule((prev) => {
      const arr = [...prev[type]];
      arr[day] = !arr[day];
      return { ...prev, [type]: arr };
    });
    setFeedback(null);
  }

  const rows: Array<{ key: "world_boss" | "rift"; label: string }> = [
    { key: "world_boss", label: "Мировой Босс" },
    { key: "rift", label: "Разлом" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Таймеры</h1>
      <p className="text-sm text-muted-foreground">
        Активируйте дни, в которые проходят мировые события. Расписание обновляется каждую минуту на сайте.
      </p>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <div className="flex gap-2">
                {Array.from({ length: 7 }).map((_, d) => (
                  <Skeleton key={d} className="h-10 w-12 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="space-y-2">
          <p className="text-destructive text-sm">Не удалось загрузить расписание.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Повторить
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Toggle grid */}
          <div className="rounded-lg border p-4 space-y-4">
            {/* Day headers */}
            <div className="flex items-center gap-2">
              <div className="w-32 shrink-0" />
              {DAY_LABELS.map((day) => (
                <div key={day} className="w-12 text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Rows */}
            {rows.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <div className="w-32 shrink-0 text-sm font-medium">{label}</div>
                {localSchedule[key].map((active, day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggle(key, day)}
                    className={cn(
                      "w-12 h-10 rounded-lg border text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-input hover:bg-muted hover:text-foreground"
                    )}
                    aria-label={`${label} — ${DAY_LABELS[day]}: ${active ? "активен" : "неактивен"}`}
                    aria-pressed={active}
                  >
                    {active ? "✓" : "–"}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Feedback */}
          {feedback && (
            <p
              className={cn(
                "text-sm",
                feedback.type === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"
              )}
            >
              {feedback.message}
            </p>
          )}

          {/* Save button */}
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
          >
            {saveMut.isPending ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>
      )}
    </div>
  );
}
