"use client";

import { useForm, Controller, type Resolver, type ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PostCreateSchema, type PostCreate } from "@/lib/schemas";
import { RichEditor } from "@/components/editor/rich-editor";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { listTags } from "@/lib/api/client";
import { useState } from "react";

interface PostFormProps {
  defaultValues?: Partial<PostCreate>;
  onSubmit: (data: PostCreate) => Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function PostForm({
  defaultValues,
  onSubmit,
  submitLabel = "Save",
  isSubmitting,
}: PostFormProps) {
  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => listTags(),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PostCreate>({
    // zodResolver infers the input type (fields with .default() are optional),
    // but our form uses the output type (PostCreate, all required). Cast to align.
    resolver: zodResolver(PostCreateSchema) as unknown as Resolver<PostCreate>,
    defaultValues: {
      type: "NEWS",
      content: { type: "doc", content: [] },
      post_metadata: {},
      tag_ids: [],
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Title</label>
        <input
          {...register("title")}
          placeholder="Post title"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.title && (
          <p className="text-destructive text-xs mt-1">{errors.title.message}</p>
        )}
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Type</label>
        <select
          {...register("type")}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="NEWS">News</option>
          <option value="ARTICLE">Article</option>
          <option value="PROMO">Promo</option>
          <option value="EVENT">Event</option>
        </select>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">Tags</label>
          <Controller
            name="tag_ids"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-3">
                {tags.map((tag) => {
                  const checked = field.value.includes(tag.id);
                  return (
                    <label
                      key={tag.id}
                      className="flex items-center gap-1.5 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            field.onChange([...field.value, tag.id]);
                          } else {
                            field.onChange(field.value.filter((id) => id !== tag.id));
                          }
                        }}
                        className="rounded border border-input"
                      />
                      {tag.name}
                    </label>
                  );
                })}
              </div>
            )}
          />
        </div>
      )}

      {/* Content */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Content</label>
        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <RichEditor value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      {/* Metadata — collapsed by default */}
      <details className="rounded-lg border">
        <summary className="px-4 py-3 text-sm font-medium cursor-pointer select-none list-none flex items-center gap-2">
          <span className="text-muted-foreground">▸</span> Metadata (JSON)
        </summary>
        <div className="px-4 pb-4 border-t">
          <Controller
            name="post_metadata"
            control={control}
            render={({ field }) => <MetadataTextarea field={field} />}
          />
        </div>
      </details>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

function MetadataTextarea({
  field,
}: {
  field: ControllerRenderProps<PostCreate, "post_metadata">;
}) {
  const [raw, setRaw] = useState(() => JSON.stringify(field.value, null, 2));

  return (
    <textarea
      value={raw}
      onChange={(e) => {
        setRaw(e.target.value);
        try {
          field.onChange(JSON.parse(e.target.value));
        } catch {
          // keep last valid value until JSON is fixed
        }
      }}
      rows={6}
      spellCheck={false}
      className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}
