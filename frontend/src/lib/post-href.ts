const TYPE_PATH: Record<string, string> = {
  NEWS: "/news",
  ARTICLE: "/articles",
  PROMO: "/promos",
  EVENT: "/events",
};

export function postHref(type: string, slug: string): string {
  return `${TYPE_PATH[type] ?? "/news"}/${slug}`;
}
