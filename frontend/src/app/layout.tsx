import type { Metadata } from "next";
import { Nunito_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeToggle } from "@/components/theme-toggle";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rift",
  description: "News, articles, and events.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${nunitoSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">
        <Providers>
          <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
              <span className="font-bold text-lg tracking-tight">Rift</span>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
