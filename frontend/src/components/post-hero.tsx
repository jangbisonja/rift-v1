import Link from "next/link";
import { CoverImage } from "@/components/cover-image";
import type { PostListItem } from "@/lib/schemas";

interface PostHeroProps {
  post: PostListItem;
  href: string;
}

export function PostHero({ post, href }: PostHeroProps) {
  return (
    <Link href={href} className="group block focus:outline-none">
      <article className="overflow-hidden rounded-xl border bg-card transition-shadow group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <div className="relative aspect-[3/1] w-full overflow-hidden bg-muted">
          <CoverImage media={post.media} alt={post.title} fill className="transition-transform group-hover:scale-[1.02]" />
        </div>
        <div className="p-5">
          {post.published_at && (
            <p className="mb-2 text-xs text-muted-foreground">
              {new Date(post.published_at).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          )}
          <h2 className="text-xl font-bold leading-snug">{post.title}</h2>
        </div>
      </article>
    </Link>
  );
}
