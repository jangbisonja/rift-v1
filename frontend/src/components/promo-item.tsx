"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { formatDate, daysRemaining } from "@/lib/date";
import type { PostListItem } from "@/lib/schemas";

interface PromoItemProps {
  post: PostListItem;
}

function DaysLabel({ endDate }: { endDate: string | null }) {
  if (!endDate) return <span className="text-xs text-muted-foreground">Бессрочно</span>;
  const days = daysRemaining(endDate);
  if (days > 0)
    return <span className="text-xs text-muted-foreground">Осталось {days} дней</span>;
  if (days === 0)
    return <span className="text-xs text-yellow-500">Истекает сегодня</span>;
  return <span className="text-xs text-destructive">Истёк</span>;
}

export function PromoItem({ post }: PromoItemProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!post.promo_code) return;
    navigator.clipboard.writeText(post.promo_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <article className="flex flex-col gap-2 border bg-card p-3">
      {post.promo_code && (
        <div className="flex items-center">
          <div className="flex-1" />
          <span className="font-mono font-semibold text-sm tracking-wide">
            {post.promo_code}
          </span>
          <div className="flex-1 flex justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Скопировать промокод"
            >
              {copied ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {post.start_date
          ? <p className="text-xs text-muted-foreground">{formatDate(post.start_date)}</p>
          : <span />}
        <DaysLabel endDate={post.end_date} />
      </div>
    </article>
  );
}
