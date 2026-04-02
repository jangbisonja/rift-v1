import { listPosts } from "@/lib/api/client";
import { postHref } from "@/lib/post-href";
import { PostHero } from "@/components/post-hero";
import { PostRowItem } from "@/components/post-row-item";
import { PromoItem } from "@/components/promo-item";
import type { PostListItem } from "@/lib/schemas";

export const revalidate = 60;

async function fetch(type: string, limit = 20): Promise<PostListItem[]> {
  try {
    return await listPosts({ post_type: type, post_status: "PUBLISHED", limit });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [news, articles, events, promos] = await Promise.all([
    fetch("NEWS", 4),
    fetch("ARTICLE", 4),
    fetch("EVENT", 4),
    fetch("PROMO"),
  ]);

  const [newsHero, ...newsRest] = news;
  const articlePairs = [articles.slice(0, 2), articles.slice(2, 4)].filter((g) => g.length > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-14">

      {/* ── News + Promos ──────────────────────────────────────────────────── */}
      {(news.length > 0 || promos.length > 0) && (
        <section>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* News column */}
            {news.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">News</h2>
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
                <h2 className="text-2xl font-bold">Promos</h2>
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
      {events.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold">Events</h2>
          <div className="space-y-3">
            {events.map((p) => (
              <PostRowItem key={p.id} post={p} href={postHref(p.type, p.slug)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Articles ──────────────────────────────────────────────────────── */}
      {articles.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold">Articles</h2>
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
        <p className="text-center py-20 text-muted-foreground">No published content yet.</p>
      )}
    </div>
  );
}
