import { listPosts } from "@/lib/api/client";
import { PromoItem } from "@/components/promo-item";
import { PageContainer } from "@/components/page-container";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";

export const revalidate = 60;

export default async function PromosPage() {
  let posts: import("@/lib/schemas").PostListItem[] = [];
  try {
    posts = await listPosts({ post_type: "PROMO", post_status: "PUBLISHED", visibility: "all" });
  } catch {
    /* empty */
  }

  return (
    <PageContainer>
      <BreadcrumbNav items={[{ label: "Главная", href: "/" }, { label: "Промокоды" }]} />
      <h1 className="mb-8 text-3xl font-bold">Промокоды</h1>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">Активных промокодов нет.</p>
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
