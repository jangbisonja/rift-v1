"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { daysRemaining } from "@/lib/date";
import { postHref } from "@/lib/post-href";
import type { PostListItem } from "@/lib/schemas";

// ─── Constants ────────────────────────────────────────────────────────────────

const COL_WIDTH = 32;   // px per day column
const TOTAL_COLS = 61;  // 60-day window + 1: today is at index 29
const TODAY_IDX = 29;
const STRIP_WIDTH = TOTAL_COLS * COL_WIDTH; // 1952px

const DOW_ABBRS = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
const MONTH_ABBRS = ["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЙ", "ИЮН",
                     "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface TimelineProps {
  events: PostListItem[];  // pre-sorted by start_date asc, nulls first
  today: string;           // "YYYY-MM-DD" in Moscow time
}

// ─── Day window ───────────────────────────────────────────────────────────────

function buildDayWindow(todayStr: string): Date[] {
  const [y, m, d] = todayStr.split("-").map(Number);
  const base = new Date(y, m - 1, d); // local midnight, used only for date arithmetic
  return Array.from({ length: TOTAL_COLS }, (_, i) => {
    const dt = new Date(base);
    dt.setDate(base.getDate() + (i - TODAY_IDX));
    return dt;
  });
}

// ─── Event-to-column mapping ──────────────────────────────────────────────────

function getEventColumns(event: PostListItem, days: Date[]): { startIdx: number; endIdx: number } {
  let startIdx = 0;
  let endIdx = TOTAL_COLS - 1;

  if (event.start_date) {
    const [sy, sm, sd] = event.start_date.split("T")[0].split("-").map(Number);
    const idx = days.findIndex(
      col => col.getFullYear() === sy && col.getMonth() + 1 === sm && col.getDate() === sd
    );
    if (idx === -1) {
      const startMs = new Date(sy, sm - 1, sd).getTime();
      startIdx = startMs > days[TOTAL_COLS - 1].getTime() ? TOTAL_COLS - 1 : 0;
    } else {
      startIdx = idx;
    }
  }

  if (event.end_date) {
    const [ey, em, ed] = event.end_date.split("T")[0].split("-").map(Number);
    const idx = days.findIndex(
      col => col.getFullYear() === ey && col.getMonth() + 1 === em && col.getDate() === ed
    );
    if (idx === -1) {
      const endMs = new Date(ey, em - 1, ed).getTime();
      endIdx = endMs < days[0].getTime() ? 0 : TOTAL_COLS - 1;
    } else {
      endIdx = idx;
    }
  }

  if (startIdx > endIdx) endIdx = startIdx;
  return { startIdx, endIdx };
}

// ─── DaysLabel ────────────────────────────────────────────────────────────────

function DaysLabel({ endDate }: { endDate: string | null }) {
  if (!endDate) return <span className="text-xs text-muted-foreground" suppressHydrationWarning>Бессрочно</span>;
  const days = daysRemaining(endDate);
  if (days > 0) return <span className="text-xs text-muted-foreground" suppressHydrationWarning>Осталось {days} дней</span>;
  if (days === 0) return <span className="text-xs text-yellow-500" suppressHydrationWarning>Истекает сегодня</span>;
  return <span className="text-xs text-destructive" suppressHydrationWarning>Истёк</span>;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export function Timeline({ events, today }: TimelineProps) {
  const days = buildDayWindow(today);
  const todayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    todayRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "instant",
    });
  }, []);

  return (
    <div className="overflow-x-auto scrollbar-thin">
      {/* Day header row */}
      <div className="flex" style={{ width: STRIP_WIDTH }}>
        {days.map((day, i) => {
          const isToday = i === TODAY_IDX;
          const isFirst = day.getDate() === 1;
          const topLabel = isFirst ? MONTH_ABBRS[day.getMonth()] : DOW_ABBRS[day.getDay()];
          return (
            <div
              key={i}
              ref={isToday ? todayRef : undefined}
              className={`flex flex-col items-center shrink-0 text-xs leading-tight py-0.5 ${isToday ? "bg-primary/10" : ""}`}
              style={{ width: COL_WIDTH }}
            >
              <span className={isFirst ? "font-bold text-primary" : "text-muted-foreground"}>
                {topLabel}
              </span>
              <span className={isToday ? "font-bold text-primary" : "text-muted-foreground"}>
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Event lanes — one per event */}
      <div className="relative mt-1" style={{ width: STRIP_WIDTH }}>
        {/* Today's vertical indicator */}
        <div
          aria-hidden="true"
          className="absolute top-0 bottom-0 pointer-events-none flex flex-col items-center"
          style={{ left: TODAY_IDX * COL_WIDTH + Math.floor(COL_WIDTH / 2) - 4 }}
        >
          {/* Downward-pointing triangle */}
          <div
            className="shrink-0 w-0 h-0"
            style={{
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '5px solid var(--color-muted-foreground)',
              opacity: 0.4,
            }}
          />
          {/* Vertical line */}
          <div
            className="w-px flex-1"
            style={{ background: 'var(--color-muted-foreground)', opacity: 0.2 }}
          />
        </div>

        {events.map((event) => {
          const { startIdx, endIdx } = getEventColumns(event, days);
          const spanWidth = (endIdx - startIdx + 1) * COL_WIDTH;
          const isExternal = event.redirect_to_external && !!event.external_link;
          const href = (isExternal && event.external_link) || postHref(event.type, event.slug);

          const cardContent = (
            <article
              className="h-12 border bg-card px-2 py-1 whitespace-nowrap flex flex-col justify-center"
              style={{ minWidth: spanWidth }}
            >
              <p className="text-sm font-semibold leading-snug">{event.title}</p>
              <DaysLabel endDate={event.end_date} />
            </article>
          );

          return (
            <div key={event.id} className="relative" style={{ height: 58 }}>
              <div className="absolute" style={{ top: 5, left: startIdx * COL_WIDTH }}>
                {isExternal ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="block focus:outline-none">
                    {cardContent}
                  </a>
                ) : (
                  <Link href={href} className="block focus:outline-none">
                    {cardContent}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
