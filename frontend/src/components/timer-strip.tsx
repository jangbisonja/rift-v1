/**
 * TimerStrip — standalone 30px strip rendered above the nav in the root layout.
 *
 * Server component: fetches the timer schedule server-side, passes it to TimerBar.
 * On fetch error: renders nothing (returns null — no crash).
 *
 * RULES.md #W4: Timer UI is an independent 30px strip above the main nav.
 * RULES.md #G4: ISR revalidate: 60.
 */

import { getTimerSchedule } from "@/lib/api/client";
import { TimerBar } from "@/components/timer-bar";

export async function TimerStrip() {
  let schedule;
  try {
    schedule = await getTimerSchedule({ revalidate: 60 });
  } catch {
    return null;
  }

  return (
    <div className="h-[30px] border-b bg-background/60 backdrop-blur">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-end px-4">
        <TimerBar schedule={schedule} />
      </div>
    </div>
  );
}
