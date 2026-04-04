"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTags, createTag, deleteTag } from "@/lib/api/client";
import { useToken } from "@/components/mod/token-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TagCreateSchema, type TagCreate } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

export default function TagsPage() {
  const token = useToken();
  const qc = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });

  return (
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
        <p className="text-muted-foreground">Loading…</p>
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
                onClick={() => deleteMut.mutate(tag.id)}
                disabled={deleteMut.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
