"use client";

import { useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRaid, uploadMedia } from "@/lib/api/client";
import { useToken } from "@/components/mod/token-context";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/mod/breadcrumbs";
import { useRouter } from "next/navigation";
import { RaidDifficultyEnum } from "@/lib/schemas";
import type { RaidCreate, MediaRead } from "@/lib/schemas";
import { RAID_DIFFICULTY_LABELS } from "@/lib/game";
import { mediaUrl } from "@/lib/media";
import { ImagePlus, X } from "lucide-react";

const RaidCreateFormSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(256),
  min_gear_score: z.coerce.number().int().min(0, "Должно быть ≥ 0"),
  difficulty: RaidDifficultyEnum,
  groups_count: z.coerce.number().int().min(1, "Минимум 1").max(4, "Максимум 4"),
  phases_count: z.coerce.number().int().min(1, "Минимум 1"),
  cover_media_id: z.string().uuid().nullable().optional(),
});

type RaidCreateFormValues = z.infer<typeof RaidCreateFormSchema>;

export default function NewRaidPage() {
  const token = useToken();
  const qc = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [displayCover, setDisplayCover] = useState<MediaRead | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RaidCreateFormValues>({
    resolver: zodResolver(RaidCreateFormSchema) as unknown as Resolver<RaidCreateFormValues>,
    defaultValues: {
      difficulty: "NORMAL",
      groups_count: 1,
      phases_count: 1,
      min_gear_score: 0,
      cover_media_id: null,
    },
  });

  const createMut = useMutation({
    mutationFn: (data: RaidCreate) => createRaid(data, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["raids"] });
      toast("Рейд создан.", "success");
      router.push("/mod/raids");
    },
    onError: () => toast("Не удалось создать рейд. Попробуйте ещё раз.", "error"),
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

  function onSubmit(data: RaidCreateFormValues) {
    const payload: RaidCreate = {
      name: data.name,
      min_gear_score: data.min_gear_score,
      difficulty: data.difficulty,
      groups_count: data.groups_count,
      phases_count: data.phases_count,
      cover_media_id: data.cover_media_id ?? null,
    };
    createMut.mutate(payload);
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <Breadcrumbs
          items={[{ label: "Рейды", href: "/mod/raids" }, { label: "Новый рейд" }]}
        />
        <h1 className="text-2xl font-bold mt-1">Новый рейд</h1>
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

        <Button type="submit" disabled={createMut.isPending}>
          {createMut.isPending ? "Создание…" : "Создать рейд"}
        </Button>
      </form>
    </div>
  );
}
