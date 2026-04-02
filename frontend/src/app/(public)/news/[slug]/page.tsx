import { notFound } from "next/navigation";
import { listPosts } from "@/lib/api/client";
import { RichTextContent } from "@/components/rich-text-content";
import { Badge } from "@/components/ui/badge";

export const revalidate = 60;

interface NewsDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { slug } = await params;

  let post;
  try {
    const results = await listPosts({ slug, post_status: "PUBLISHED" });
    post = results[0];
  } catch {
    notFound();
  }

  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 space-y-3">
        <Badge variant="secondary">{post.type}</Badge>
        <h1 className="text-4xl font-bold leading-tight">{post.title}</h1>
        {post.published_at && (
          <p className="text-sm text-muted-foreground">
            Published{" "}
            {new Date(post.published_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
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
      </header>

      <RichTextContent content={post.content} />
    </article>
  );
}
