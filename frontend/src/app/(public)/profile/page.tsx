"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { logoutPublicUser, deleteMe } from "@/lib/api/client";
import { NicknameForm } from "@/components/nickname-form";
import { ConfirmDialog } from "@/components/mod/confirm-dialog";
import { useToast } from "@/components/toast-provider";
import { PageContainer } from "@/components/page-container";

export default function ProfilePage() {
  const { user, isLoading, refreshUser } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [showNicknameForm, setShowNicknameForm] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && user === null) {
      router.push("/");
    }
  }, [isLoading, user, router]);

  async function handleLogout() {
    await logoutPublicUser();
    await refreshUser();
    router.push("/");
  }

  async function handleDelete() {
    try {
      await deleteMe();
      await refreshUser();
      router.push("/");
    } catch {
      toast("Не удалось удалить аккаунт. Попробуйте снова.", "error");
      setDeleteOpen(false);
    }
  }

  if (isLoading || user === null) {
    return null; // redirect fires in useEffect
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold mb-8">Профиль</h1>

      <div className="max-w-md space-y-8">
        {/* Nickname section */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Никнейм
          </h2>
          {!showNicknameForm ? (
            <div className="flex items-center gap-3">
              <span
                className="text-lg font-semibold"
                style={user.nickname_color ? { color: user.nickname_color } : undefined}
              >
                {user.nickname}
              </span>
              {user.badge && (
                <span className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground">
                  {user.badge}
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowNicknameForm(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Изменить
              </button>
            </div>
          ) : (
            <NicknameForm
              onSuccess={async () => {
                await refreshUser();
                setShowNicknameForm(false);
              }}
              onCancel={() => setShowNicknameForm(false)}
            />
          )}
        </section>

        {/* Discord info section */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Discord
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground w-32 shrink-0">Пользователь</span>
              <span>{user.discord_username}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground w-32 shrink-0">Discord ID</span>
              <span className="font-mono text-xs">{user.discord_id}</span>
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            Выйти
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            Удалить аккаунт
          </button>
        </section>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Удалить аккаунт"
        description="Это действие необратимо. Все данные профиля будут удалены."
        confirmLabel="Удалить"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </PageContainer>
  );
}
