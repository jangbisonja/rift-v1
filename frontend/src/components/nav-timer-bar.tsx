"use client";

/**
 * NavTimerBar — inline timer display inside the nav, homepage only (RULES.md #W4).
 *
 * Self-fetches the schedule using getTimerSchedule() from @/lib/api/client.
 * Uses usePathname() to gate rendering — only renders on "/".
 * Runs a setInterval(1000) countdown client-side.
 * All UI text in Russian. (RULES.md #T3)
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { getTimerSchedule } from "@/lib/api/client";
import type { TimerSchedule } from "@/lib/api/client";
import { computeSecondsUntil, formatCountdown } from "@/lib/timer-logic";

interface TimerEntryProps {
  label: string;
  icon: string;
  seconds: number | null;
}

function TimerEntry({ label, icon, seconds }: TimerEntryProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Image
        src={icon}
        alt={label}
        width={18}
        height={18}
        className="object-contain"
      />
      <span className="text-xs font-medium text-muted-foreground">{label}:</span>
      <span className="text-xs font-mono font-semibold tabular-nums">
        {seconds !== null ? formatCountdown(seconds) : "Сегодня нет"}
      </span>
    </div>
  );
}

export function NavTimerBar() {
  const pathname = usePathname();
  const [schedule, setSchedule] = useState<TimerSchedule | null>(null);
  const [worldBossSeconds, setWorldBossSeconds] = useState<number | null>(null);
  const [riftSeconds, setRiftSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (pathname !== "/") return;

    getTimerSchedule().then(setSchedule).catch(() => {
      // Fetch failed — render nothing (schedule stays null)
    });
  }, [pathname]);

  useEffect(() => {
    if (!schedule) return;

    function tick() {
      setWorldBossSeconds(computeSecondsUntil(schedule!.world_boss));
      setRiftSeconds(computeSecondsUntil(schedule!.rift));
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [schedule]);

  if (pathname !== "/" || !schedule) return null;

  return (
    <div className="flex items-center gap-4">
      <TimerEntry
        label="Мировой Босс"
        icon="/assets/timers/world_boss.webp"
        seconds={worldBossSeconds}
      />
      <div className="w-px h-4 bg-border" aria-hidden="true" />
      <TimerEntry
        label="Разлом"
        icon="/assets/timers/rift.webp"
        seconds={riftSeconds}
      />
    </div>
  );
}
