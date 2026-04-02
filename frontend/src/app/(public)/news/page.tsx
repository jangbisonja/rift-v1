import { listPosts } from "@/lib/api/client";
import { PostCard } from "@/components/post-card";

export const revalidate = 60;

const PAGE_SIZE = 12;

interface NewsPageProps {
  searchParams: Promise<{ offset?: string }>;
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const { offset: offsetParam } = await searchParams;
  const offset = Number(offsetParam ?? 0);

  let posts;
  try {
    posts = await listPosts({ post_type: "NEWS", post_status: "PUBLISHED", limit: PAGE_SIZE, offset });
  } catch {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <p className="text-muted-foreground">Could not load news. Try again later.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">News</h1>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">No published news yet.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
