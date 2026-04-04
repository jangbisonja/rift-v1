"use client";

import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";

// On any 401, clear the session cookie and force a full redirect to login.
// The HTTP-only cookie can't be cleared from JS directly, so we call the
// logout route handler which sets maxAge=0, then redirect.
function handleUnauthorized() {
  fetch("/api/auth/logout", { method: "POST" }).finally(() => {
    window.location.href = "/mod/login";
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof ApiError && error.status === 401) {
              handleUnauthorized();
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (error instanceof ApiError && error.status === 401) {
              handleUnauthorized();
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Don't retry 401s — the token is invalid, retrying won't help.
            retry: (count, error) => {
              if (error instanceof ApiError && error.status === 401) return false;
              return count < 1;
            },
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
