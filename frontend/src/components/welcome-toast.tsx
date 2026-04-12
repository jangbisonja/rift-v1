"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";

export function WelcomeToast() {
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    toast("Добро пожаловать! Регистрация прошла успешно.", "success");
    // Remove ?welcome=1 from URL without triggering page reload
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    router.replace(url.pathname + (url.search || ""), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
