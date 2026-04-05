"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy } from "lucide-react";
import { formatDate } from "@/lib/date";
import type { PostListItem } from "@/lib/schemas";

interface PromoItemProps {
  post: PostListItem;
}

function daysRemaining(endDate: string): number {
  const endMs = new Date(endDate).getTime();
  const nowMs = Date.now();
  return Math.floor((endMs - nowMs) / 86_400_000);
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
    <Link href={`/promos/${post.slug}`} className="group block focus:outline-none">
      <article className="flex flex-col gap-2 overflow-hidden rounded-lg border bg-card p-3 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        {/* Promo code row */}
        {post.promo_code && (
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-base tracking-wide">
              {post.promo_code}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="ml-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Скопировать промокод"
            >
              {copied ? (
                <span className="text-xs font-medium text-green-500">Скопировано</span>
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
        )}

        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{post.title}</h3>

        {/* Dates + expiry */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {post.start_date && (
            <p className="text-xs text-muted-foreground">{formatDate(post.start_date)}</p>
          )}
          <DaysLabel endDate={post.end_date} />
        </div>
      </article>
    </Link>
  );
}
