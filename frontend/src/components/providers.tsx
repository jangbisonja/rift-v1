"use client";

import { ThemeProvider } from "next-themes";
import { UserProvider } from "@/lib/user-context";
import { ToastProvider } from "@/components/toast-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <UserProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
