import { listPosts } from "@/lib/api/client";
import { PromoItem } from "@/components/promo-item";
import { PageContainer } from "@/components/page-container";

export const revalidate = 60;

export default async function PromosPage() {
  let posts: import("@/lib/schemas").PostListItem[] = [];
  try {
    posts = await listPosts({ post_type: "PROMO", post_status: "PUBLISHED" });
  } catch {
    /* empty */
  }

  return (
    <PageContainer>
      <h1 className="mb-8 text-3xl font-bold">Акции</h1>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">Активных акций нет.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PromoItem key={p.id} post={p} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
