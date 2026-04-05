import Link from "next/link";
import { CoverImage } from "@/components/cover-image";
import { formatDate } from "@/lib/date";
import type { PostListItem } from "@/lib/schemas";

interface PromoItemProps {
  post: PostListItem;
}

export function PromoItem({ post }: PromoItemProps) {
  return (
    <Link href={`/promos/${post.slug}`} className="group block focus:outline-none">
      <article className="flex gap-3 overflow-hidden rounded-lg border bg-card p-3 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
          <CoverImage cover={post.cover_media} alt={post.title} fill />
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{post.title}</h3>
          {post.published_at && (
            <p className="text-xs text-muted-foreground">
              {formatDate(post.published_at)}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
