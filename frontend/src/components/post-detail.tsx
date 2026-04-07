import { CoverImage } from "@/components/cover-image";
import { RichTextContent } from "@/components/rich-text-content";
import { PageContainer } from "@/components/page-container";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Badge } from "@/components/ui/badge";
import { formatDate, getPostPhase } from "@/lib/date";
import { ExternalLink } from "lucide-react";
import type { Post } from "@/lib/schemas";

const BACK: Record<string, { href: string; label: string }> = {
  NEWS:    { href: "/news",     label: "Новости" },
  ARTICLE: { href: "/articles", label: "Статьи" },
  PROMO:   { href: "/promos",   label: "Промокоды" },
  EVENT:   { href: "/events",   label: "События" },
};

const TYPE_LABEL: Record<string, string> = {
  NEWS:    "Новости",
  ARTICLE: "Статьи",
  PROMO:   "Промокоды",
  EVENT:   "События",
};

function EventPhaseLabel({ startDate, endDate }: { startDate: string | null; endDate: string | null }) {
  const phase = getPostPhase(startDate, endDate);
  switch (phase.kind) {
    case "indefinite":
    case "active_indefinite":
      return <span className="text-muted-foreground">Бессрочно</span>;
    case "upcoming":
      return <span className="text-muted-foreground">Начнётся через {phase.days} дней</span>;
    case "starting_today":
      return <span className="text-yellow-500">Начинается сегодня</span>;
    case "active":
      return <span className="text-muted-foreground">Осталось {phase.days} дней</span>;
    case "expiring_today":
      return <span className="text-yellow-500">Истекает сегодня</span>;
    case "expired":
      return <span className="text-destructive">Истёк {phase.days} дней назад</span>;
  }
}

interface PostDetailProps {
  post: Post;
}

export function PostDetail({ post }: PostDetailProps) {
  const back = BACK[post.type];

  return (
    <PageContainer>
      <article>
        <BreadcrumbNav items={[
          { label: "Главная", href: "/" },
          ...(back ? [{ label: back.label, href: back.href }] : []),
          { label: post.title },
        ]} />
        <header className="mb-8 space-y-4">
          {post.cover_media && (
            <div className="relative h-[300px] w-full overflow-hidden bg-muted">
              <CoverImage
                cover={post.cover_media}
                alt={post.title}
                fill
                className="object-cover object-center"
              />
            </div>
          )}
          <div className="space-y-2">
            <Badge variant="secondary">{TYPE_LABEL[post.type] ?? post.type}</Badge>
            <h1 className="text-4xl font-bold leading-tight">{post.title}</h1>
            {post.published_at && (
              <p className="text-sm text-muted-foreground">
                {formatDate(post.published_at)}
              </p>
            )}
            {post.type === "EVENT" && (post.start_date || post.end_date) && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {post.start_date && <span>{formatDate(post.start_date)}</span>}
                {post.start_date && post.end_date && <span>—</span>}
                {post.end_date && <span>{formatDate(post.end_date)}</span>}
                <EventPhaseLabel startDate={post.start_date} endDate={post.end_date} />
              </div>
            )}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag.id} variant="outline" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </header>
        <RichTextContent content={post.content} />
        {post.external_link && (
          <div className="mt-6">
            <a
              href={post.external_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-medium underline underline-offset-4"
            >
              Перейти к событию
              <ExternalLink size={16} />
            </a>
          </div>
        )}
      </article>
    </PageContainer>
  );
}
