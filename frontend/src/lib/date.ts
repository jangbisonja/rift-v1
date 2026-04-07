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
 * Get today's date as "YYYY-MM-DD" in Moscow time, using sv-SE locale
 * (produces ISO-format date strings natively).
 */
function getMoscowTodayDateStr(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Count whole calendar days between two YYYY-MM-DD strings.
 * Returns a positive number when b is after a.
 */
function calendarDaysBetween(a: string, b: string): number {
  const msA = new Date(a).getTime();
  const msB = new Date(b).getTime();
  return Math.round(Math.abs(msB - msA) / 86_400_000);
}

export type PostPhase =
  | { kind: "indefinite" }
  | { kind: "upcoming"; days: number }
  | { kind: "starting_today" }
  | { kind: "active_indefinite" }
  | { kind: "active"; days: number }
  | { kind: "expiring_today" }
  | { kind: "expired"; days: number };

/**
 * Determine the current phase of a post based on its start and end dates.
 * All comparisons are made against today's calendar date in Moscow time (UTC+3).
 * Date strings are compared as YYYY-MM-DD without timestamp conversion.
 */
export function getPostPhase(
  startDate: string | null,
  endDate: string | null,
): PostPhase {
  const today = getMoscowTodayDateStr();
  // Normalize to date-only (strip any time component)
  const start = startDate ? startDate.split("T")[0] : null;
  const end = endDate ? endDate.split("T")[0] : null;

  if (!start && !end) return { kind: "indefinite" };

  if (!start && end) {
    // No start date — evaluate purely by end date
    if (end > today) return { kind: "active", days: calendarDaysBetween(today, end) };
    if (end === today) return { kind: "expiring_today" };
    return { kind: "expired", days: calendarDaysBetween(end, today) };
  }

  // Has a start date
  if (start! > today) return { kind: "upcoming", days: calendarDaysBetween(today, start!) };
  if (start === today) return { kind: "starting_today" };

  // start is in the past
  if (!end) return { kind: "active_indefinite" };
  if (end > today) return { kind: "active", days: calendarDaysBetween(today, end) };
  if (end === today) return { kind: "expiring_today" };
  return { kind: "expired", days: calendarDaysBetween(end, today) };
}

/**
 * Converts a UTC ISO string from the API to a datetime-local input value in Moscow time.
 * e.g. "2026-04-11T06:32:00+00:00" → "2026-04-11T09:32"
 */
export function toDatetimeLocal(isoStr: string): string {
  const date = new Date(isoStr)
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "00"
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`
}

/**
 * Converts a datetime-local input value (interpreted as Moscow time, UTC+3) to a UTC ISO string.
 * e.g. "2026-04-11T09:32" → "2026-04-11T06:32:00.000Z"
 */
export function fromDatetimeLocal(localStr: string): string {
  return new Date(localStr + ":00+03:00").toISOString()
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
