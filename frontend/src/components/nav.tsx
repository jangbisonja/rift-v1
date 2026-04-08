import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavTimerBar } from "@/components/nav-timer-bar";

const LINKS = [
  { href: "/news", label: "Новости" },
  { href: "/articles", label: "Статьи" },
  { href: "/events", label: "События" },
  { href: "/promos", label: "Промокоды" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-lg tracking-tight">
            Rift
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <NavTimerBar />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
