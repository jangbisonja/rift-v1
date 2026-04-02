import { listPosts } from "@/lib/api/client";
import { PostCard } from "@/components/post-card";

export const revalidate = 60;

export default async function ArticlesPage() {
  let items: import("@/lib/schemas").Post[] = [];
  try {
    items = await listPosts({ post_type: "ARTICLE", post_status: "PUBLISHED", limit: 12 });
  } catch {
    /* serve empty state on error */
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">Articles</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">No published articles yet.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
