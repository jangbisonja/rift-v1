"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTags, createTag, deleteTag } from "@/lib/api/client";
import { useToken } from "@/components/mod/token-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TagCreateSchema, type TagCreate } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/mod/confirm-dialog";
import { Trash2, Plus } from "lucide-react";

export default function TagsPage() {
  const token = useToken();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);

  const { data: tags = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["tags"],
    queryFn: () => listTags(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TagCreate>({
    resolver: zodResolver(TagCreateSchema),
  });

  const createMut = useMutation({
    mutationFn: (data: TagCreate) => createTag(data, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      reset();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTag(id, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      setConfirm(null);
    },
  });

  return (
    <>
      <div className="space-y-6 max-w-lg">
        <h1 className="text-2xl font-bold">Tags</h1>

        <form
          onSubmit={handleSubmit((data) => createMut.mutate(data))}
          className="flex gap-2"
        >
          <div className="flex-1">
            <input
              {...register("name")}
              placeholder="New tag name"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.name && (
              <p className="text-destructive text-xs mt-1">{errors.name.message}</p>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || createMut.isPending}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </form>

        {isLoading ? (
          <ul className="divide-y rounded-lg border">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center px-4 py-2.5 gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </li>
            ))}
          </ul>
        ) : isError ? (
          <div className="space-y-2">
            <p className="text-destructive text-sm">Failed to load tags.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {tags.map((tag) => (
              <li key={tag.id} className="flex items-center px-4 py-2.5 gap-3">
                <span className="text-sm font-medium">{tag.name}</span>
                <span className="text-xs text-muted-foreground flex-1">{tag.slug}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setConfirm({ id: tag.id, name: tag.name })}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={`Delete tag "${confirm?.name}"?`}
        description="Posts using this tag will be untagged."
        onConfirm={() => confirm && deleteMut.mutate(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
