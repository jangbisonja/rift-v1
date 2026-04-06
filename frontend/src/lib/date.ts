const fmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const fmtDateTime = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Format an ISO date string for display on public pages.
 * Locale: ru-RU. Timezone: Europe/Moscow (UTC+3, no DST).
 * Output example: "5 апреля 2026 г."
 */
export function formatDate(dateStr: string): string {
  return fmt.format(new Date(dateStr));
}

/**
 * Format an ISO datetime string showing date + time in Moscow timezone.
 * Locale: ru-RU. Timezone: Europe/Moscow (UTC+3, no DST).
 * Output example: "30 апреля 2026, 23:59"
 */
export function formatDateTime(dateStr: string): string {
  return fmtDateTime.format(new Date(dateStr));
}

/**
 * Calculate the number of full days remaining until `endDateStr` (interpreted as
 * end-of-day in Moscow time). "Now" is also resolved in Moscow time so the result
 * is correct near midnight regardless of the server/browser timezone.
 * Positive = days left, 0 = expires today, negative = already expired.
 */
export function daysRemaining(endDateStr: string): number {
  const endMs = new Date(endDateStr).getTime();
  // Resolve "now" in Moscow (UTC+3, no DST)
  const moscowNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Moscow" }),
  );
  return Math.floor((endMs - moscowNow.getTime()) / 86_400_000);
}

/**
 * Return today's date as "YYYY-MM-DD" in Moscow timezone (UTC+3, no DST).
 * Used to anchor the Timeline component's 61-day window.
 */
export function getMoscowTodayStr(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const d = parts.find(p => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}
