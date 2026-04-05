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
