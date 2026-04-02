import { listPosts } from "@/lib/api/client";
import { postHref } from "@/lib/post-href";
import { PostHero } from "@/components/post-hero";
import { PostRowItem } from "@/components/post-row-item";

export const revalidate = 60;

export default async function NewsPage() {
  let posts: import("@/lib/schemas").PostListItem[] = [];
  try {
    posts = await listPosts({ post_type: "NEWS", post_status: "PUBLISHED" });
  } catch {
    /* empty */
  }

  const [hero, ...rest] = posts;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">News</h1>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">No published news yet.</p>
      ) : (
        <div className="space-y-6">
          {hero && <PostHero post={hero} href={postHref(hero.type, hero.slug)} />}
          <div className="space-y-3">
            {rest.map((p) => (
              <PostRowItem key={p.id} post={p} href={postHref(p.type, p.slug)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
