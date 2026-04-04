"use client";

import { useRef, useState } from "react";
import { useForm, Controller, type Resolver, type ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PostCreateSchema, PostType, type PostCreate, type MediaRead } from "@/lib/schemas";
import { RichEditor } from "@/components/editor/rich-editor";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { listTags } from "@/lib/api/client";
import { mediaUrl } from "@/lib/media";
import { ImagePlus, X } from "lucide-react";

interface PostFormProps {
  defaultValues?: Partial<PostCreate>;
  onSubmit: (data: PostCreate) => Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
  /** The currently set cover image — shown in the cover section. */
  initialCoverMedia?: MediaRead | null;
  /** Upload a file and return the resulting MediaRead (upload only, no attach). */
  onCoverUpload?: (file: File) => Promise<MediaRead>;
  /** Upload handler for TipTap inline images — returns URL to insert. */
  onEditorImageUpload?: (file: File) => Promise<string>;
  /** Media attached to this post, shown in the editor library picker. */
  mediaLibrary?: MediaRead[];
}

export function PostForm({
  defaultValues,
  onSubmit,
  submitLabel = "Save",
  isSubmitting,
  initialCoverMedia,
  onCoverUpload,
  onEditorImageUpload,
  mediaLibrary,
}: PostFormProps) {
  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => listTags(),
  });

  const coverInputRef = useRef<HTMLInputElement>(null);
  const [displayCover, setDisplayCover] = useState<MediaRead | null>(initialCoverMedia ?? null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
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
      cover_media_id: initialCoverMedia?.id ?? null,
      ...defaultValues,
    },
  });

  async function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onCoverUpload) return;
    e.target.value = "";
    setIsUploadingCover(true);
    try {
      const media = await onCoverUpload(file);
      setDisplayCover(media);
      setValue("cover_media_id", media.id);
    } finally {
      setIsUploadingCover(false);
    }
  }

  function removeCover() {
    setDisplayCover(null);
    setValue("cover_media_id", null);
  }

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
          {PostType.options.map((value) => (
            <option key={value} value={value}>
              {value.charAt(0) + value.slice(1).toLowerCase()}
            </option>
          ))}
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

      {/* Cover Image */}
      {onCoverUpload && (
        <div>
          <label className="block text-sm font-medium mb-1.5">Cover image</label>
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
              {isUploadingCover ? "Uploading…" : "Upload cover"}
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverFileChange}
          />
          {/* Hidden field so cover_media_id is part of the form submission */}
          <input type="hidden" {...register("cover_media_id")} />
        </div>
      )}

      {/* Content */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Content</label>
        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <RichEditor
              value={field.value}
              onChange={field.onChange}
              onUploadImage={onEditorImageUpload}
              mediaLibrary={mediaLibrary}
            />
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
