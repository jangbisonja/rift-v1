import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Post } from "@/lib/schemas";

const TYPE_HREF: Record<string, string> = {
  NEWS: "/news",
  ARTICLE: "/articles",
  PROMO: "/promos",
  EVENT: "/events",
};

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const href = `${TYPE_HREF[post.type] ?? "/news"}/${post.slug}`;

  return (
    <Link href={href} className="group block focus:outline-none">
      <Card className="h-full transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CardHeader className="pb-2">
          <div className="mb-2">
            <Badge variant="secondary" className="text-xs">
              {post.type}
            </Badge>
          </div>
          <CardTitle className="line-clamp-2 text-base">{post.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {post.published_at && (
            <p className="text-xs text-muted-foreground">
              {new Date(post.published_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
