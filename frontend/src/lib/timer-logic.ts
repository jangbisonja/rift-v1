/**
 * Pure timer computation functions — no React imports.
 * Extracted from timer-bar.tsx so they can be shared by NavTimerBar.
 *
 * MSK = UTC+3, fixed offset. No DST. No Intl timezone DB. (RULES.md #T2)
 */

/** Convert JS Date.getDay() (Sun=0) to ISO weekday (Mon=0, Sun=6). */
export function toIsoDow(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/** Get current MSK Date (UTC+3 fixed). */
export function getMskNow(): Date {
  return new Date(Date.now() + 3 * 60 * 60 * 1000);
}

/**
 * Compute the ceiling of msk to the next whole UTC hour.
 * We work in UTC values but they represent MSK time because we shifted by +3h.
 * "Next XX:00 MSK" means the next UTC timestamp where (UTC time) is an exact hour.
 */
export function ceilToNextHour(msk: Date): Date {
  const ms = msk.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const remainder = ms % hourMs;
  if (remainder === 0) {
    // Exactly on the hour — advance to next hour (W3: events fire every hour on the hour)
    return new Date(ms + hourMs);
  }
  return new Date(ms - remainder + hourMs);
}

/**
 * Compute in-game day-of-week for a given MSK timestamp.
 * If MSK hour < 6, in-game day = previous calendar day. (RULES.md #W1)
 * Returns ISO weekday: Mon=0 … Sun=6.
 */
export function inGameDow(msk: Date): number {
  // msk is a Date whose UTC values represent MSK time
  const hour = msk.getUTCHours();
  if (hour >= 6) {
    return toIsoDow(msk.getUTCDay());
  }
  // Subtract 1 calendar day
  const prev = new Date(msk.getTime() - 24 * 60 * 60 * 1000);
  return toIsoDow(prev.getUTCDay());
}

/**
 * Given the current MSK time and a schedule array, return the seconds until the
 * next active event slot, or null if there is no active slot today.
 */
export function computeSecondsUntil(schedule: boolean[]): number | null {
  const mskNow = getMskNow();
  let nextSlot = ceilToNextHour(mskNow);

  // "Same calendar day" means the MSK date is the same as mskNow's MSK date.
  // Since mskNow = UTC+3, the MSK midnight is at UTC midnight shifted by 3h.
  // We compare the UTC date of nextSlot against the UTC date of mskNow
  // (both having been shifted +3h — so their "UTC date" is the MSK calendar date).
  const mskTodayDateStr = `${mskNow.getUTCFullYear()}-${mskNow.getUTCMonth()}-${mskNow.getUTCDate()}`;

  // Maximum two iterations (TIMERS.md: "At most two in-game day checks per evaluation")
  for (let i = 0; i < 2; i++) {
    // Check if next_slot is within the same MSK calendar day
    const slotDateStr = `${nextSlot.getUTCFullYear()}-${nextSlot.getUTCMonth()}-${nextSlot.getUTCDate()}`;
    if (slotDateStr !== mskTodayDateStr) {
      return null; // past midnight MSK — no slot today
    }

    const slotHour = nextSlot.getUTCHours();

    const dow = inGameDow(nextSlot);

    if (schedule[dow]) {
      // Active slot found — compute countdown in seconds.
      // Both nextSlot and mskNow are in the same fake-UTC (MSK+0) domain,
      // so their difference is the correct real-time duration with no offset error.
      const diff = Math.floor((nextSlot.getTime() - mskNow.getTime()) / 1000);
      return diff > 0 ? diff : 0;
    } else {
      // Skip to next window
      if (slotHour < 6) {
        // Jump to 06:00 MSK of the current MSK calendar day
        // mskNow MSK calendar day starts at UTC (mskNow UTC midnight - 3h) = UTC (mskNow - 3h)
        // 06:00 MSK = 03:00 UTC
        const mskDateStart = new Date(
          Date.UTC(mskNow.getUTCFullYear(), mskNow.getUTCMonth(), mskNow.getUTCDate(), 3, 0, 0, 0)
        );
        nextSlot = mskDateStart;
      } else {
        // No further in-game windows this calendar day
        return null;
      }
    }
  }

  return null;
}

export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}
