"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { getPostPhase } from "@/lib/date";
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

function DaysLabel({ startDate, endDate }: { startDate: string | null; endDate: string | null }) {
  const phase = getPostPhase(startDate, endDate);
  switch (phase.kind) {
    case "indefinite":
    case "active_indefinite":
      return <span className="text-xs text-muted-foreground" suppressHydrationWarning>Бессрочно</span>;
    case "upcoming":
      return <span className="text-xs text-muted-foreground" suppressHydrationWarning>Начнётся через {phase.days} дней</span>;
    case "starting_today":
      return <span className="text-xs text-yellow-500" suppressHydrationWarning>Начинается сегодня</span>;
    case "active":
      return <span className="text-xs text-muted-foreground" suppressHydrationWarning>Осталось {phase.days} дней</span>;
    case "expiring_today":
      return <span className="text-xs text-yellow-500" suppressHydrationWarning>Истекает сегодня</span>;
    case "expired":
      return <span className="text-xs text-destructive" suppressHydrationWarning>Истёк {phase.days} дней назад</span>;
  }
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
      {/* Outer wrapper — establishes containing block for the indicator */}
      <div className="relative pt-[5px]" style={{ width: STRIP_WIDTH }}>

        {/* Today indicator — triangle sits in the 5px gap above the date row, tip flush with its top edge */}
        <div
          aria-hidden="true"
          className="absolute w-0 h-0 pointer-events-none"
          style={{
            top: 0,
            left: TODAY_IDX * COL_WIDTH + COL_WIDTH / 2 - 4,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '5px solid var(--color-primary)',
          }}
        />

        {/* Day header row */}
        <div className="flex">
          {days.map((day, i) => {
            const isToday = i === TODAY_IDX;
            const isFirst = day.getDate() === 1;
            const topLabel = isFirst ? MONTH_ABBRS[day.getMonth()] : DOW_ABBRS[day.getDay()];
            return (
              <div
                key={i}
                ref={isToday ? todayRef : undefined}
                className={`flex flex-col items-center shrink-0 text-xs leading-tight py-0.5 ${isToday ? "bg-primary/10 ring-1 ring-primary" : ""}`}
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

        {/* Event lanes */}
        <div className="relative pt-[10px] pb-[10px]">
          {/* Today indicator — vertical line starts here, below the date row */}
          <div
            aria-hidden="true"
            className="absolute top-0 bottom-0 w-px pointer-events-none"
            style={{ left: TODAY_IDX * COL_WIDTH + COL_WIDTH / 2, background: 'var(--color-primary)', opacity: 0.5 }}
          />
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
                <DaysLabel startDate={event.start_date} endDate={event.end_date} />
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
    </div>
  );
}
