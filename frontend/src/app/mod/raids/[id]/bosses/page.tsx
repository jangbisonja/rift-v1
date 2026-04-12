"use client";

import { useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRaid,
  listRaidBosses,
  createRaidBoss,
  updateRaidBoss,
  deleteRaidBoss,
  uploadMedia,
} from "@/lib/api/client";
import { useToken } from "@/components/mod/token-context";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/mod/confirm-dialog";
import { Breadcrumbs } from "@/components/mod/breadcrumbs";
import { useParams } from "next/navigation";
import type { RaidBoss, RaidBossCreate, MediaRead } from "@/lib/schemas";
import { mediaUrl } from "@/lib/media";
import { Plus, Pencil, Trash2, X, ImagePlus } from "lucide-react";

// ─── Boss Form Schema ──────────────────────────────────────────────────────────

const BossFormSchema = z.object({
  name: z.string().min(1, "Имя обязательно").max(256),
  phase_number: z.coerce.number().int().min(1, "Минимум 1"),
  icon_media_id: z.string().uuid().nullable().optional(),
});

type BossFormValues = z.infer<typeof BossFormSchema>;

// ─── Boss Dialog ───────────────────────────────────────────────────────────────

interface BossDialogProps {
  title: string;
  defaultValues?: Partial<BossFormValues>;
  initialIconMedia?: MediaRead | null;
  onSubmit: (data: RaidBossCreate, iconMedia: MediaRead | null) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
  token: string;
}

function BossDialog({
  title,
  defaultValues,
  initialIconMedia,
  onSubmit,
  onClose,
  isSubmitting,
  token,
}: BossDialogProps) {
  const { toast } = useToast();
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [displayIcon, setDisplayIcon] = useState<MediaRead | null>(initialIconMedia ?? null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BossFormValues>({
    resolver: zodResolver(BossFormSchema) as unknown as Resolver<BossFormValues>,
    defaultValues: {
      phase_number: 1,
      icon_media_id: initialIconMedia?.id ?? null,
      ...defaultValues,
    },
  });

  async function handleIconFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setIsUploadingIcon(true);
    try {
      const media = await uploadMedia(file, token);
      setDisplayIcon(media);
      setValue("icon_media_id", media.id);
    } catch {
      toast("Не удалось загрузить изображение.", "error");
    } finally {
      setIsUploadingIcon(false);
    }
  }

  function removeIcon() {
    setDisplayIcon(null);
    setValue("icon_media_id", null);
  }

  async function handleFormSubmit(data: BossFormValues) {
    const payload: RaidBossCreate = {
      name: data.name,
      phase_number: data.phase_number,
      icon_media_id: data.icon_media_id ?? null,
    };
    await onSubmit(payload, displayIcon);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg">
        <h2 className="text-base font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Имя босса</label>
            <input
              {...register("name")}
              placeholder="Имя"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.name && (
              <p className="text-destructive text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Phase Number */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Номер фазы</label>
            <input
              type="number"
              {...register("phase_number")}
              min={1}
              className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.phase_number && (
              <p className="text-destructive text-xs mt-1">{errors.phase_number.message}</p>
            )}
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Иконка</label>
            {displayIcon ? (
              <div className="relative w-16 rounded-lg overflow-hidden border bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(displayIcon.path)}
                  alt={displayIcon.original_name}
                  className="aspect-square w-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={removeIcon}
                  className="absolute top-0.5 right-0.5 size-5"
                >
                  <X className="size-2.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => iconInputRef.current?.click()}
                disabled={isUploadingIcon}
                className="flex h-16 w-16 items-center justify-center gap-1 rounded-lg border border-dashed border-input bg-background text-xs text-muted-foreground hover:border-ring hover:text-foreground transition-colors disabled:opacity-50"
              >
                <ImagePlus className="size-3.5" />
                {isUploadingIcon ? "…" : "Загрузить"}
              </button>
            )}
            <input
              ref={iconInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleIconFileChange}
            />
            <input type="hidden" {...register("icon_media_id")} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; boss: RaidBoss }
  | null;

export default function RaidBossesPage() {
  const { id: raidId } = useParams<{ id: string }>();
  const token = useToken();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: raid, isLoading: raidLoading } = useQuery({
    queryKey: ["raid", raidId],
    queryFn: () => getRaid(raidId, token),
  });

  const { data: bossesData, isLoading: bossesLoading, isError, refetch } = useQuery({
    queryKey: ["raid-bosses", raidId],
    queryFn: () => listRaidBosses(raidId, { limit: 100 }, token),
  });

  const bosses: RaidBoss[] = bossesData?.items ?? [];

  const createMut = useMutation({
    mutationFn: (data: RaidBossCreate) => createRaidBoss(raidId, data, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["raid-bosses", raidId] });
      setDialog(null);
      toast("Босс добавлен.", "success");
    },
    onError: () => toast("Не удалось добавить босса.", "error"),
  });

  const updateMut = useMutation({
    mutationFn: ({ bossId, data }: { bossId: string; data: Partial<RaidBossCreate> }) =>
      updateRaidBoss(raidId, bossId, data, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["raid-bosses", raidId] });
      setDialog(null);
      toast("Изменения сохранены.", "success");
    },
    onError: () => toast("Не удалось сохранить изменения.", "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (bossId: string) => deleteRaidBoss(raidId, bossId, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["raid-bosses", raidId] });
      setConfirmDelete(null);
      toast("Босс удалён.", "success");
    },
    onError: () => toast("Не удалось удалить босса.", "error"),
  });

  const isLoading = raidLoading || bossesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-8 rounded" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
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
        <p className="text-destructive">Не удалось загрузить боссов.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Повторить
        </Button>
      </div>
    );
  }

  const raidName = raid?.name ?? "…";

  return (
    <>
      <div className="space-y-6">
        <div>
          <Breadcrumbs
            items={[
              { label: "Рейды", href: "/mod/raids" },
              { label: raidName, href: `/mod/raids/${raidId}` },
              { label: "Боссы" },
            ]}
          />
          <div className="flex items-center justify-between mt-1">
            <h1 className="text-2xl font-bold">Боссы рейда: {raidName}</h1>
            <Button size="sm" onClick={() => setDialog({ mode: "create" })} className="gap-1.5">
              <Plus className="size-4" />
              Добавить босса
            </Button>
          </div>
        </div>

        {bosses.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">Боссов пока нет.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-14">
                    Иконка
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Имя
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">
                    Фаза
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bosses.map((boss) => (
                  <tr key={boss.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {boss.icon_media ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaUrl(boss.icon_media.path)}
                          alt={boss.icon_media.original_name}
                          className="w-8 h-8 rounded object-cover bg-muted"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">—</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{boss.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">Фаза {boss.phase_number}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDialog({ mode: "edit", boss })}
                          title="Редактировать"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setConfirmDelete({ id: boss.id, name: boss.name })}
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
      </div>

      {/* Create Dialog */}
      {dialog?.mode === "create" && (
        <BossDialog
          title="Добавить босса"
          token={token}
          isSubmitting={createMut.isPending}
          onSubmit={async (data) => { await createMut.mutateAsync(data); }}
          onClose={() => setDialog(null)}
        />
      )}

      {/* Edit Dialog */}
      {dialog?.mode === "edit" && (
        <BossDialog
          title="Редактировать босса"
          defaultValues={{
            name: dialog.boss.name,
            phase_number: dialog.boss.phase_number,
            icon_media_id: dialog.boss.icon_media?.id ?? null,
          }}
          initialIconMedia={dialog.boss.icon_media}
          token={token}
          isSubmitting={updateMut.isPending}
          onSubmit={async (data) => {
            await updateMut.mutateAsync({ bossId: dialog.boss.id, data });
          }}
          onClose={() => setDialog(null)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title={`Удалить босса «${confirmDelete?.name}»?`}
        description="Это действие нельзя отменить."
        confirmLabel="Удалить"
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
