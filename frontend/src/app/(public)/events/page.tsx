import { listPosts } from "@/lib/api/client";
import { postHref } from "@/lib/post-href";
import { PostRowItem } from "@/components/post-row-item";
import { PageContainer } from "@/components/page-container";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";

export const revalidate = 60;

export default async function EventsPage() {
  let posts: import("@/lib/schemas").PostListItem[] = [];
  try {
    posts = await listPosts({ post_type: "EVENT", post_status: "PUBLISHED" });
  } catch {
    /* empty */
  }

  return (
    <PageContainer>
      <BreadcrumbNav items={[{ label: "Главная", href: "/" }, { label: "События" }]} />
      <h1 className="mb-8 text-3xl font-bold">События</h1>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">Предстоящих событий нет.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const isExternal = p.redirect_to_external && !!p.external_link;
            const href = (isExternal && p.external_link) || postHref(p.type, p.slug);
            return <PostRowItem key={p.id} post={p} href={href} isExternal={isExternal} />;
          })}
        </div>
      )}
    </PageContainer>
  );
}
