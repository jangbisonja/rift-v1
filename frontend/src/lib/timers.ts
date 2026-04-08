/**
 * Timer schedule fetch helper.
 * Calls GET /timers/schedule with ISR revalidate: 60 (RULES.md #G4).
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface TimerSchedule {
  /** 7-element boolean array. Index 0 = Monday, index 6 = Sunday (ISO 8601). */
  world_boss: boolean[];
  /** 7-element boolean array. Index 0 = Monday, index 6 = Sunday (ISO 8601). */
  rift: boolean[];
}

export async function getTimerSchedule(): Promise<TimerSchedule> {
  const res = await fetch(`${BASE_URL}/timers/schedule`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch timer schedule: ${res.status}`);
  }
  return res.json() as Promise<TimerSchedule>;
}
