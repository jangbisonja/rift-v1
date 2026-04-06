import { listPosts } from "@/lib/api/client";
import { postHref } from "@/lib/post-href";
import { PostHero } from "@/components/post-hero";
import { PostRowItem } from "@/components/post-row-item";
import { PromoItem } from "@/components/promo-item";
import { Timeline } from "@/components/timeline";
import type { PostListItem } from "@/lib/schemas";
import { PageContainer } from "@/components/page-container";
import { getMoscowTodayStr } from "@/lib/date";

export const revalidate = 60;

async function fetchPosts(type: string, limit = 20, visibility?: "public" | "all"): Promise<PostListItem[]> {
  try {
    return await listPosts({ post_type: type, post_status: "PUBLISHED", limit, visibility });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [news, articles, events, promos] = await Promise.all([
    fetchPosts("NEWS", 4),
    fetchPosts("ARTICLE", 4),
    fetchPosts("EVENT", 100, "public"),
    fetchPosts("PROMO", 20, "public"),
  ]);

  const [newsHero, ...newsRest] = news;
  const articlePairs = [articles.slice(0, 2), articles.slice(2, 4)].filter((g) => g.length > 0);

  const sortedEvents = [...events].sort((a, b) => {
    if (!a.start_date && !b.start_date) return 0;
    if (!a.start_date) return -1;
    if (!b.start_date) return 1;
    return a.start_date.localeCompare(b.start_date);
  });

  const todayStr = getMoscowTodayStr();

  return (
    <PageContainer className="space-y-14">

      {/* ── News + Promos ──────────────────────────────────────────────────── */}
      {(news.length > 0 || promos.length > 0) && (
        <section>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* News column */}
            {news.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Новости</h2>
                {newsHero && (
                  <PostHero post={newsHero} href={postHref(newsHero.type, newsHero.slug)} />
                )}
                <div className="space-y-3">
                  {newsRest.map((p) => (
                    <PostRowItem key={p.id} post={p} href={postHref(p.type, p.slug)} />
                  ))}
                </div>
              </div>
            )}

            {/* Promos column */}
            {promos.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Промокоды</h2>
                <div className="space-y-3">
                  {promos.map((p) => (
                    <PromoItem key={p.id} post={p} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Events ────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-2xl font-bold">События</h2>
        <Timeline events={sortedEvents} today={todayStr} />
      </section>

      {/* ── Articles ──────────────────────────────────────────────────────── */}
      {articles.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold">Статьи</h2>
          <div className="space-y-6">
            {articlePairs.map((pair, i) => (
              <div key={i} className="grid gap-4 sm:grid-cols-2">
                {pair.map((p) => (
                  <PostRowItem key={p.id} post={p} href={postHref(p.type, p.slug)} />
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {news.length === 0 && articles.length === 0 && events.length === 0 && promos.length === 0 && (
        <p className="text-center py-20 text-muted-foreground">Опубликованных материалов пока нет.</p>
      )}
    </PageContainer>
  );
}
