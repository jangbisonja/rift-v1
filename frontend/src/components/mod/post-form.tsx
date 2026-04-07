"use client";

import { useRef, useState, useEffect } from "react";
import { useForm, useWatch, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PostCreateSchema, PostType, type PostCreate, type MediaRead } from "@/lib/schemas";
import { RichEditor } from "@/components/editor/rich-editor";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { listTags } from "@/lib/api/client";
import { mediaUrl } from "@/lib/media";
import { toDatetimeLocal, fromDatetimeLocal } from "@/lib/date";
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
  const [noEndDate, setNoEndDate] = useState(() => {
    const ed = defaultValues?.end_date;
    return ed === null || ed === undefined;
  });

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
      start_date: null,
      end_date: null,
      promo_code: null,
      external_link: null,
      redirect_to_external: false,
      ...defaultValues,
      // Convert UTC ISO strings from the API to Moscow-time datetime-local values
      // so the datetime-local inputs display and accept Moscow time.
      ...(defaultValues?.start_date != null && { start_date: toDatetimeLocal(defaultValues.start_date) }),
      ...(defaultValues?.end_date != null && { end_date: toDatetimeLocal(defaultValues.end_date) }),
    },
  });

  // useWatch (not watch) to avoid unnecessary re-renders on unrelated field changes.
  const selectedType = useWatch({ control, name: "type" });

  // Clear type-specific stale values when the user switches type, so fields from
  // the previous type are never silently submitted with the new type's data.
  const prevTypeRef = useRef(selectedType);
  useEffect(() => {
    const prev = prevTypeRef.current;
    prevTypeRef.current = selectedType;
    if (prev === selectedType) return;
    if (prev === "PROMO") {
      setValue("promo_code", null);
    }
    if (prev === "EVENT") {
      setValue("external_link", null);
      setValue("redirect_to_external", false);
    }
    if ((prev === "EVENT" || prev === "PROMO") && selectedType !== "EVENT" && selectedType !== "PROMO") {
      setValue("start_date", null);
      setValue("end_date", null);
      setNoEndDate(true);
    }
  }, [selectedType, setValue]);

  const showTitle = selectedType !== "PROMO";
  const showCover = selectedType !== "PROMO" && !!onCoverUpload;
  const showTags = selectedType === "NEWS";
  const showContent = selectedType !== "PROMO";
  const showDates = selectedType === "EVENT" || selectedType === "PROMO";
  const showPromoCode = selectedType === "PROMO";
  const showExternalLink = selectedType === "EVENT";

  async function handleFormSubmit(data: PostCreate) {
    // Convert datetime-local values (YYYY-MM-DDTHH:MM, Moscow time) back to UTC ISO strings
    // before sending to the API. Null values are passed through unchanged.
    const payload: PostCreate = {
      ...data,
      start_date: data.start_date ? fromDatetimeLocal(data.start_date) : null,
      end_date: data.end_date ? fromDatetimeLocal(data.end_date) : null,
    };
    return onSubmit(payload);
  }

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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Type — always first */}
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

      {/* Title */}
      {showTitle && (
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
      )}

      {/* Cover Image */}
      {showCover && (
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

      {/* Tags — NEWS only */}
      {showTags && tags.length > 0 && (
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

      {/* Content (TipTap) */}
      {showContent && (
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
      )}

      {/* Start / End Date — EVENT and PROMO */}
      {showDates && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Start date</label>
            <input
              type="datetime-local"
              {...register("start_date")}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">End date</label>
            <div className="space-y-2">
              {!noEndDate && (
                <input
                  type="datetime-local"
                  {...register("end_date")}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={noEndDate}
                  onChange={(e) => {
                    setNoEndDate(e.target.checked);
                    if (e.target.checked) {
                      setValue("end_date", null);
                    }
                  }}
                  className="rounded border border-input"
                />
                No end date
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Promo Code — PROMO only */}
      {showPromoCode && (
        <div>
          <label className="block text-sm font-medium mb-1.5">Promo code</label>
          <input
            {...register("promo_code")}
            placeholder="e.g. SUMMER25"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {/* External link — EVENT only */}
      {showExternalLink && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">External link</label>
            <input
              type="url"
              {...register("external_link")}
              placeholder="https://..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              {...register("redirect_to_external")}
              className="rounded border border-input"
            />
            Redirect cards directly to external link (skip internal page)
          </label>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
