import { listPosts } from "@/lib/api/client";
import { PostCard } from "@/components/post-card";
import type { Post } from "@/lib/schemas";

const SECTIONS = [
  { type: "NEWS", label: "News" },
  { type: "ARTICLE", label: "Articles" },
  { type: "PROMO", label: "Promotions" },
  { type: "EVENT", label: "Events" },
] as const;

async function fetchSection(type: string): Promise<Post[]> {
  try {
    return await listPosts(
      { post_type: type, post_status: "PUBLISHED", limit: 4 },
      { revalidate: 60 },
    );
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const sections = await Promise.all(
    SECTIONS.map(async (s) => ({ ...s, posts: await fetchSection(s.type) })),
  );

  const hasAnyContent = sections.some((s) => s.posts.length > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-14">
      {!hasAnyContent && (
        <p className="text-muted-foreground text-center py-20">No published content yet.</p>
      )}
      {sections.map((section) =>
        section.posts.length === 0 ? null : (
          <section key={section.type}>
            <h2 className="mb-6 text-2xl font-bold">{section.label}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {section.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        ),
      )}
    </div>
  );
}
