import { listPosts } from "@/lib/api/client";
import { postHref } from "@/lib/post-href";
import { PostRowItem } from "@/components/post-row-item";
import { PageContainer } from "@/components/page-container";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";

export const revalidate = 60;

export default async function ArticlesPage() {
  let posts: import("@/lib/schemas").PostListItem[] = [];
  try {
    posts = await listPosts({ post_type: "ARTICLE", post_status: "PUBLISHED" });
  } catch {
    /* empty */
  }

  return (
    <PageContainer>
      <BreadcrumbNav items={[{ label: "Главная", href: "/" }, { label: "Статьи" }]} />
      <h1 className="mb-8 text-3xl font-bold">Статьи</h1>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">Статей пока нет.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((p) => (
            <PostRowItem key={p.id} post={p} href={postHref(p.type, p.slug)} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
