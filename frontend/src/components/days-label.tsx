import { cn } from "@/lib/utils";
import { getPostPhase } from "@/lib/date";

interface DaysLabelProps {
  startDate: string | null;
  endDate: string | null;
  className?: string;
}

export function DaysLabel({ startDate, endDate, className }: DaysLabelProps) {
  const phase = getPostPhase(startDate, endDate);
  switch (phase.kind) {
    case "indefinite":
    case "active_indefinite":
      return <span className={cn("text-muted-foreground", className)} suppressHydrationWarning>Бессрочно</span>;
    case "upcoming":
      return <span className={cn("text-muted-foreground", className)} suppressHydrationWarning>Начнётся через {phase.days} дней</span>;
    case "starting_today":
      return <span className={cn("text-yellow-500", className)} suppressHydrationWarning>Начинается сегодня</span>;
    case "active":
      return <span className={cn("text-muted-foreground", className)} suppressHydrationWarning>Осталось {phase.days} дней</span>;
    case "expiring_today":
      return <span className={cn("text-yellow-500", className)} suppressHydrationWarning>Истекает сегодня</span>;
    case "expired":
      return <span className={cn("text-destructive", className)} suppressHydrationWarning>Истёк {phase.days} дней назад</span>;
  }
}
