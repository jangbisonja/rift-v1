import { listPosts } from "@/lib/api/client";
import { postHref } from "@/lib/post-href";
import { PostRowItem } from "@/components/post-row-item";

export const revalidate = 60;

export default async function EventsPage() {
  let posts: import("@/lib/schemas").PostListItem[] = [];
  try {
    posts = await listPosts({ post_type: "EVENT", post_status: "PUBLISHED" });
  } catch {
    /* empty */
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">Events</h1>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">No upcoming events.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostRowItem key={p.id} post={p} href={postHref(p.type, p.slug)} />
          ))}
        </div>
      )}
    </div>
  );
}
