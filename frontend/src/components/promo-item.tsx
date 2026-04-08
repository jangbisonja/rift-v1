import { DaysLabel } from "@/components/days-label";
import { PromoCopyButton } from "@/components/promo-copy-button";
import { formatDate } from "@/lib/date";
import type { PostListItem } from "@/lib/schemas";

interface PromoItemProps {
  post: PostListItem;
}

export function PromoItem({ post }: PromoItemProps) {
  return (
    <article className="flex flex-col gap-2 border bg-card p-3">
      {post.promo_code && (
        <div className="flex items-center">
          <div className="flex-1" />
          <span className="font-mono font-semibold text-sm tracking-wide">
            {post.promo_code}
          </span>
          <div className="flex-1 flex justify-end">
            <PromoCopyButton promoCode={post.promo_code} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {post.start_date
          ? <p className="text-xs text-muted-foreground">{formatDate(post.start_date)}</p>
          : <span />}
        <DaysLabel startDate={post.start_date} endDate={post.end_date} className="text-xs" />
      </div>
    </article>
  );
}
