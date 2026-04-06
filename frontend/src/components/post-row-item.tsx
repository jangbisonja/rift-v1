import Link from "next/link";
import { CoverImage } from "@/components/cover-image";
import { formatDate } from "@/lib/date";
import type { PostListItem } from "@/lib/schemas";

interface PostRowItemProps {
  post: PostListItem;
  href: string;
  isExternal?: boolean;
}

const cardClass = "flex gap-4 overflow-hidden border bg-card p-3 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring";

function CardContent({ post }: { post: PostListItem }) {
  return (
    <article className={cardClass}>
      <div className="relative h-20 w-28 shrink-0 overflow-hidden bg-muted sm:h-24 sm:w-36">
        <CoverImage cover={post.cover_media} alt={post.title} fill />
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-1">
        {post.published_at && (
          <p className="text-xs text-muted-foreground">
            {formatDate(post.published_at)}
          </p>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{post.title}</h3>
        {post.excerpt && (
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {post.excerpt}…
          </p>
        )}
      </div>
    </article>
  );
}

export function PostRowItem({ post, href, isExternal }: PostRowItemProps) {
  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="group block focus:outline-none">
        <CardContent post={post} />
      </a>
    );
  }
  return (
    <Link href={href} className="group block focus:outline-none">
      <CardContent post={post} />
    </Link>
  );
}
