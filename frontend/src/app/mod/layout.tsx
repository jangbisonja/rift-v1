import { getServerToken } from "@/lib/api/server";
import { QueryProvider } from "@/components/query-provider";
import { TokenProvider } from "@/components/mod/token-context";
import { ModSidebar } from "@/components/mod/sidebar";

export default async function ModLayout({ children }: { children: React.ReactNode }) {
  const token = (await getServerToken()) ?? "";

  // No token — render children only (login page)
  if (!token) {
    return <div className="mx-auto max-w-md px-4 py-16">{children}</div>;
  }

  return (
    <TokenProvider token={token}>
      <QueryProvider>
        <div className="mx-auto max-w-7xl px-4 py-6 flex gap-8">
          <ModSidebar />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </QueryProvider>
    </TokenProvider>
  );
}
