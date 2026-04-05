# Category Rendering Specs

All public-facing UI is in Russian (`ru-RU`). All dates and calculations use `Europe/Moscow` (UTC+3, no DST).

---

## NEWS

### Homepage block
```
[ Hero post — large card ]
[ Row item ]
[ Row item ]
[ Row item ]
```

**Hero card (`post-hero.tsx`)**
Layout: cover image left (3:1 aspect), right column = title + date + excerpt.
Excerpt: first 10 words of `post.excerpt` followed by `…`

**Row item (`post-row-item.tsx`)**
Layout: cover image left (fixed size), right column = title + date + excerpt.
Excerpt: same rule — `post.excerpt` + `…`

### News archive page (`/news`)
Same row item card as homepage. Paginated.

---

## PROMOS

### Homepage block
Compact list — no cover image, even if one is uploaded.

Each item shows:
- Promo code string (`post.promo_code`) — prominent, monospaced, with copy-to-clipboard button
- Post title
- Start date (`post.start_date`) — formatted in Russian via `formatDate()`
- Days remaining — computed from `post.end_date` (parsed as TIMESTAMPTZ, compared to now). Display as "Осталось N дней" / "Истекает сегодня" / "Истёк" / "Бессрочно" (when `end_date` is null).

### Promo archive page (`/promos`)
Same compact card. Paginated.

---

## EVENTS

Spec TBD — do not implement yet.

---

## ARTICLES

Spec TBD — do not implement yet.
