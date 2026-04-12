"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, Tag, Image, Timer, Shield, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/mod/posts", label: "Posts", icon: FileText },
  { href: "/mod/tags", label: "Tags", icon: Tag },
  { href: "/mod/media", label: "Media", icon: Image },
  { href: "/mod/timers", label: "Таймеры", icon: Timer },
  { href: "/mod/raids", label: "Рейды", icon: Shield },
];

export function ModSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/mod/login");
    router.refresh();
  }

  return (
    <aside className="w-44 shrink-0">
      <nav className="flex flex-col gap-0.5">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-6 border-t pt-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
