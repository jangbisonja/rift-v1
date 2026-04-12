"use client";

import { useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRaid, updateRaid, deleteRaid, uploadMedia } from "@/lib/api/client";
import { useToken } from "@/components/mod/token-context";
import { useToast } from "@/components/toast-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/mod/confirm-dialog";
import { Breadcrumbs } from "@/components/mod/breadcrumbs";
import { useParams, useRouter } from "next/navigation";
import { RaidDifficultyEnum } from "@/lib/schemas";
import type { RaidCreate, MediaRead } from "@/lib/schemas";
import { RAID_DIFFICULTY_LABELS } from "@/lib/game";
import { mediaUrl } from "@/lib/media";
import { ImagePlus, X, Users } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const RaidEditFormSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(256),
  min_gear_score: z.coerce.number().int().min(0, "Должно быть ≥ 0"),
  difficulty: RaidDifficultyEnum,
  groups_count: z.coerce.number().int().min(1, "Минимум 1").max(4, "Максимум 4"),
  phases_count: z.coerce.number().int().min(1, "Минимум 1"),
  cover_media_id: z.string().uuid().nullable().optional(),
});

type RaidEditFormValues = z.infer<typeof RaidEditFormSchema>;

export default function EditRaidPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const qc = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [displayCover, setDisplayCover] = useState<MediaRead | null | undefined>(undefined);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: raid, isLoading, isError } = useQuery({
    queryKey: ["raid", id],
    queryFn: () => getRaid(id, token),
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RaidEditFormValues>({
    resolver: zodResolver(RaidEditFormSchema) as unknown as Resolver<RaidEditFormValues>,
  });

  // Populate form once raid data is loaded
  const [initialized, setInitialized] = useState(false);
  if (raid && !initialized) {
    reset({
      name: raid.name,
      min_gear_score: raid.min_gear_score,
      difficulty: raid.difficulty,
      groups_count: raid.groups_count,
      phases_count: raid.phases_count,
      cover_media_id: raid.cover_media?.id ?? null,
    });
    setDisplayCover(raid.cover_media);
    setInitialized(true);
  }

  const updateMut = useMutation({
    mutationFn: (data: Partial<RaidCreate>) => updateRaid(id, data, token),
    onSuccess: (updated) => {
      qc.setQueryData(["raid", id], updated);
      qc.invalidateQueries({ queryKey: ["raids"] });
      toast("Изменения сохранены.", "success");
    },
    onError: () => toast("Не удалось сохранить. Попробуйте ещё раз.", "error"),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteRaid(id, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["raids"] });
      toast("Рейд удалён.", "success");
      router.push("/mod/raids");
    },
    onError: () => toast("Не удалось удалить рейд.", "error"),
  });

  async function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setIsUploadingCover(true);
    try {
      const media = await uploadMedia(file, token);
      setDisplayCover(media);
      setValue("cover_media_id", media.id);
    } catch {
      toast("Не удалось загрузить изображение.", "error");
    } finally {
      setIsUploadingCover(false);
    }
  }

  function removeCover() {
    setDisplayCover(null);
    setValue("cover_media_id", null);
  }

  function onSubmit(data: RaidEditFormValues) {
    const payload: Partial<RaidCreate> = {
      name: data.name,
      min_gear_score: data.min_gear_score,
      difficulty: data.difficulty,
      groups_count: data.groups_count,
      phases_count: data.phases_count,
      cover_media_id: data.cover_media_id ?? null,
    };
    updateMut.mutate(payload);
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-xl">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-24 w-48" />
      </div>
    );
  }

  if (isError || !raid) {
    return <p className="text-destructive">Рейд не найден.</p>;
  }

  return (
    <>
      <div className="space-y-8 max-w-xl">
        <div>
          <Breadcrumbs
            items={[{ label: "Рейды", href: "/mod/raids" }, { label: raid.name }]}
          />
          <div className="flex items-center gap-3 flex-wrap mt-1">
            <h1 className="text-2xl font-bold">Редактировать рейд</h1>
            <div className="flex gap-2 ml-auto">
              <Link
                href={`/mod/raids/${id}/bosses`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
              >
                <Users className="size-4" />
                Управлять боссами
              </Link>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Удалить
              </Button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Название</label>
            <input
              {...register("name")}
              placeholder="Название рейда"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.name && (
              <p className="text-destructive text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Сложность</label>
            <select
              {...register("difficulty")}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {RaidDifficultyEnum.options.map((value) => (
                <option key={value} value={value}>
                  {RAID_DIFFICULTY_LABELS[value] ?? value}
                </option>
              ))}
            </select>
            {errors.difficulty && (
              <p className="text-destructive text-xs mt-1">{errors.difficulty.message}</p>
            )}
          </div>

          {/* Min Gear Score */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Минимальный GS</label>
            <input
              type="number"
              {...register("min_gear_score")}
              min={0}
              className="w-32 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.min_gear_score && (
              <p className="text-destructive text-xs mt-1">{errors.min_gear_score.message}</p>
            )}
          </div>

          {/* Groups Count */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Количество групп</label>
            <input
              type="number"
              {...register("groups_count")}
              min={1}
              max={4}
              className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.groups_count && (
              <p className="text-destructive text-xs mt-1">{errors.groups_count.message}</p>
            )}
          </div>

          {/* Phases Count */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Количество фаз</label>
            <input
              type="number"
              {...register("phases_count")}
              min={1}
              className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.phases_count && (
              <p className="text-destructive text-xs mt-1">{errors.phases_count.message}</p>
            )}
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Обложка</label>
            {displayCover ? (
              <div className="relative w-48 rounded-lg overflow-hidden border bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(displayCover.path)}
                  alt={displayCover.original_name}
                  className="aspect-video w-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={removeCover}
                  className="absolute top-1.5 right-1.5 size-6"
                >
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="flex h-24 w-48 items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-background text-sm text-muted-foreground hover:border-ring hover:text-foreground transition-colors disabled:opacity-50"
              >
                <ImagePlus className="size-4" />
                {isUploadingCover ? "Загрузка…" : "Загрузить обложку"}
              </button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverFileChange}
            />
            <input type="hidden" {...register("cover_media_id")} />
          </div>

          <Button type="submit" disabled={updateMut.isPending}>
            {updateMut.isPending ? "Сохранение…" : "Сохранить изменения"}
          </Button>
        </form>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title={`Удалить рейд «${raid.name}»?`}
        description="Это действие нельзя отменить."
        confirmLabel="Удалить"
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
