"use client";

/**
 * UserButton — nav button that opens the UserModal (if not logged in)
 * or navigates to /profile (if logged in).
 *
 * When user is logged in: shows icon + nickname (colored).
 * When user is not logged in: shows icon only.
 *
 * This component is the "use client" leaf; Nav remains a server component.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { UserModal } from "@/components/user-modal";

export function UserButton() {
  const { user } = useUser();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  function handleClick() {
    if (user !== null) {
      router.push("/profile");
    } else {
      setModalOpen(true);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Профиль"
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-md px-2 h-8 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
      >
        <User className="size-4 shrink-0" />
        {user !== null && (
          <span
            className="text-sm font-medium"
            style={user.nickname_color ? { color: user.nickname_color } : undefined}
          >
            {user.nickname}
          </span>
        )}
      </button>
      <UserModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
