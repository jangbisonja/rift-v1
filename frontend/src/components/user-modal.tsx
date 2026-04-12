"use client";

/**
 * UserModal — login modal for unauthenticated users.
 *
 * State A — not logged in: shows Discord login button.
 * If the user is already logged in when the modal opens, redirects to /profile.
 *
 * RULES.md #A1: auth via HTTP-only cookie, never localStorage.
 * RULES.md #T3: all UI text in Russian.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { discordAuthorizeUrl } from "@/lib/api/client";
import {
  DialogRoot,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserModal({ open, onOpenChange }: UserModalProps) {
  const { user, isLoading } = useUser();
  const router = useRouter();

  // If logged in, redirect to profile
  useEffect(() => {
    if (open && user !== null) {
      router.push("/profile");
      onOpenChange(false);
    }
  }, [open, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return null;
  if (user !== null) return null;

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogClose />
          <DialogTitle>Войти</DialogTitle>
          <a
            href={discordAuthorizeUrl()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-[#5865F2] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4752C4] transition-colors"
          >
            Войти через Discord
          </a>
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  );
}
