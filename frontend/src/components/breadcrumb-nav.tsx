import Link from "next/link";

interface BreadcrumbNavProps {
  items: { label: string; href?: string }[];
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <nav aria-label="breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <span aria-hidden>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
