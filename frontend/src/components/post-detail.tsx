import { CoverImage } from "@/components/cover-image";
import { RichTextContent } from "@/components/rich-text-content";
import { Badge } from "@/components/ui/badge";
import type { Post } from "@/lib/schemas";

interface PostDetailProps {
  post: Post;
}

export function PostDetail({ post }: PostDetailProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 space-y-4">
        {post.media.length > 0 && (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted">
            <CoverImage media={post.media} alt={post.title} fill />
          </div>
        )}
        <div className="space-y-2">
          <Badge variant="secondary">{post.type}</Badge>
          <h1 className="text-4xl font-bold leading-tight">{post.title}</h1>
          {post.published_at && (
            <p className="text-sm text-muted-foreground">
              {new Date(post.published_at).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          )}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </header>
      <RichTextContent content={post.content} />
    </article>
  );
}
