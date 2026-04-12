"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listRaids, deleteRaid } from "@/lib/api/client";
import { useToken } from "@/components/mod/token-context";
import { useToast } from "@/components/toast-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/mod/confirm-dialog";
import Link from "next/link";
import { Plus, Pencil, Trash2, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { RAID_DIFFICULTY_LABELS } from "@/lib/game";
import { mediaUrl } from "@/lib/media";
import type { Raid } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function RaidsPage() {
  const token = useToken();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["raids", page],
    queryFn: () => listRaids({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }, token),
  });

  const raids: Raid[] = data?.items ?? [];
  const total = data?.total ?? 0;

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRaid(id, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["raids"] });
      setConfirm(null);
      toast("Рейд удалён.", "success");
    },
    onError: () => toast("Не удалось удалить рейд. Попробуйте ещё раз.", "error"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-10 w-10 rounded" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3 py-8">
        <p className="text-destructive">Не удалось загрузить рейды.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Рейды</h1>
          <Link
            href="/mod/raids/new"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            <Plus className="size-4" />
            Новый рейд
          </Link>
        </div>

        {raids.length === 0 && page === 0 ? (
          <p className="text-muted-foreground py-12 text-center">Рейдов пока нет.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-14">
                    Обложка
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Название
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">
                    Сложность
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">
                    Мин. GS
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">
                    Группы
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">
                    Фазы
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground w-48">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {raids.map((raid) => (
                  <tr key={raid.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {raid.cover_media ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaUrl(raid.cover_media.path)}
                          alt={raid.cover_media.original_name}
                          className="w-10 h-10 rounded object-cover bg-muted"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">—</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{raid.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {RAID_DIFFICULTY_LABELS[raid.difficulty] ?? raid.difficulty}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{raid.min_gear_score}</td>
                    <td className="px-4 py-3 text-muted-foreground">{raid.groups_count}</td>
                    <td className="px-4 py-3 text-muted-foreground">{raid.phases_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/mod/raids/${raid.id}`}
                          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                          title="Редактировать"
                        >
                          <Pencil className="size-3.5" />
                        </Link>
                        <Link
                          href={`/mod/raids/${raid.id}/bosses`}
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
                          title="Боссы"
                        >
                          <Users className="size-3.5" />
                          Боссы
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setConfirm({ id: raid.id, name: raid.name })}
                          className="text-destructive hover:text-destructive"
                          title="Удалить"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
          >
            <ChevronLeft className="size-4" />
            Назад
          </Button>
          <span className="text-sm text-muted-foreground">
            Стр. {page + 1} · всего {total}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={raids.length < PAGE_SIZE}
          >
            Вперёд
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={`Удалить рейд «${confirm?.name}»?`}
        description="Это действие нельзя отменить."
        confirmLabel="Удалить"
        onConfirm={() => confirm && deleteMut.mutate(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
