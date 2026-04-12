"use client";

/**
 * TimerBar — 30px header bar with two side-by-side countdowns.
 *
 * MSK = UTC+3, fixed offset. No DST. No Intl timezone DB. (RULES.md #T2)
 * Receives schedule as a prop — does NOT fetch data. (RULES.md #G4 — parent fetches)
 * Renders on Homepage only. (RULES.md #W4)
 * All UI text in Russian. (RULES.md #T3)
 *
 * Algorithm per TIMERS.md:
 *   1. msk_now   = Date.now() + 3h (fixed UTC+3)
 *   2. next_slot = ceiling to next XX:00 MSK
 *   3. Loop while next_slot is within today's MSK calendar day (≤ 23:59:59):
 *      a. Compute in_game_dow (Mon=0, Sun=6) — if MSK hour < 6, subtract 1 day
 *      b. If schedule[type][in_game_dow] active → show HH:MM:SS countdown
 *      c. Else if next_slot.hour < 6 → jump to 06:00 MSK today
 *         Else break (no more windows today)
 *   4. If loop exits without finding a slot → "Сегодня нет"
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import type { TimerSchedule } from "@/lib/timers";
import { computeSecondsUntil, formatCountdown } from "@/lib/timer-logic";

interface TimerBarProps {
  schedule: TimerSchedule;
}

interface TimerDisplayProps {
  label: string;
  icon: string;
  seconds: number | null;
}

function TimerDisplay({ label, icon, seconds }: TimerDisplayProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Image
        src={icon}
        alt={label}
        width={20}
        height={20}
        className="size-5 object-contain"
      />
      <span className="text-xs font-medium text-muted-foreground">{label}:</span>
      <span className="text-xs font-mono font-semibold tabular-nums">
        {seconds !== null ? formatCountdown(seconds) : "Сегодня нет"}
      </span>
    </div>
  );
}

export function TimerBar({ schedule }: TimerBarProps) {
  const [worldBossSeconds, setWorldBossSeconds] = useState<number | null>(null);
  const [riftSeconds, setRiftSeconds] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      setWorldBossSeconds(computeSecondsUntil(schedule.world_boss));
      setRiftSeconds(computeSecondsUntil(schedule.rift));
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [schedule]);

  return (
    <div className="flex items-center gap-6">
      <TimerDisplay
        label="Мировой Босс"
        icon="/assets/timers/world_boss.webp"
        seconds={worldBossSeconds}
      />
      <TimerDisplay
        label="Разлом"
        icon="/assets/timers/rift.webp"
        seconds={riftSeconds}
      />
    </div>
  );
}
