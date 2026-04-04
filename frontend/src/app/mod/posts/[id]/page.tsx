"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPost,
  updatePost,
  publishPost,
  unpublishPost,
  archivePost,
  uploadMedia,
  attachMedia,
  deleteMedia,
} from "@/lib/api/client";
import { useToken } from "@/components/mod/token-context";
import { useToast } from "@/components/toast-provider";
import { PostForm } from "@/components/mod/post-form";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/mod/confirm-dialog";
import { Breadcrumbs } from "@/components/mod/breadcrumbs";
import { useParams } from "next/navigation";
import type { PostCreate } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mediaUrl } from "@/lib/media";
import { Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmMediaId, setConfirmMediaId] = useState<string | null>(null);

  const {
    data: post,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["post", id],
    queryFn: () => getPost(id, { token }),
  });

  const updateMut = useMutation({
    mutationFn: (data: PostCreate) => updatePost(id, data, token),
    onSuccess: (updated) => {
      qc.setQueryData(["post", id], updated);
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast("Saved.", "success");
    },
    onError: () => toast("Failed to save. Please try again.", "error"),
  });

  const publishMut = useMutation({
    mutationFn: () => publishPost(id, token),
    onSuccess: (updated) => qc.setQueryData(["post", id], updated),
  });

  const unpublishMut = useMutation({
    mutationFn: () => unpublishPost(id, token),
    onSuccess: (updated) => qc.setQueryData(["post", id], updated),
  });

  const archiveMut = useMutation({
    mutationFn: () => archivePost(id, token),
    onSuccess: (updated) => qc.setQueryData(["post", id], updated),
  });

  // Gallery attach — for editor library picker
  const galleryUploadMut = useMutation({
    mutationFn: async (file: File) => {
      const m = await uploadMedia(file, token);
      return attachMedia(m.id, id, token);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post", id] }),
  });

  const deleteMediaMut = useMutation({
    mutationFn: (mediaId: string) => deleteMedia(mediaId, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post", id] });
      setConfirmMediaId(null);
    },
  });

  function handleGalleryFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) galleryUploadMut.mutate(file);
    e.target.value = "";
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-32 ml-auto" />
          </div>
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (isError || !post) return <p className="text-destructive">Post not found.</p>;

  const defaultValues: Partial<PostCreate> = {
    title: post.title,
    type: post.type,
    content: post.content,
    post_metadata: post.post_metadata,
    tag_ids: post.tags.map((t) => t.id),
    cover_media_id: post.cover_media?.id ?? null,
  };

  return (
    <>
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-1">
      <Breadcrumbs items={[{ label: "Posts", href: "/mod/posts" }, { label: post.title }]} />
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Edit post</h1>
        <Badge variant="outline">{post.status}</Badge>
        <div className="flex gap-1 ml-auto">
          {post.status === "DRAFT" && (
            <Button
              size="sm"
              onClick={() => publishMut.mutate()}
              disabled={publishMut.isPending}
            >
              Publish
            </Button>
          )}
          {post.status === "PUBLISHED" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => unpublishMut.mutate()}
              disabled={unpublishMut.isPending}
            >
              Unpublish
            </Button>
          )}
          {post.status !== "ARCHIVE" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => archiveMut.mutate()}
              disabled={archiveMut.isPending}
            >
              Archive
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-mono">{post.slug}</p>
      </div>

      <PostForm
        key={post.id}
        defaultValues={defaultValues}
        onSubmit={async (data) => { await updateMut.mutateAsync(data); }}
        isSubmitting={updateMut.isPending}
        submitLabel="Save changes"
        initialCoverMedia={post.cover_media}
        onCoverUpload={async (file) => {
          // Upload only — cover_media_id is set via the form's PUT /posts/{id}
          return uploadMedia(file, token);
        }}
        onEditorImageUpload={async (file) => {
          // Upload only — body images are NOT attached to post.media[]
          const m = await uploadMedia(file, token);
          return mediaUrl(m.path);
        }}
        mediaLibrary={post.media}
      />

      {/* ── Gallery (for editor library picker) ─────────────── */}
      <div className="border-t pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Gallery</h2>
            <p className="text-xs text-muted-foreground">
              Attached images are available in the editor library picker.
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleGalleryFileChange}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={galleryUploadMut.isPending}
            >
              <Upload className="size-4" />
              {galleryUploadMut.isPending ? "Uploading…" : "Upload & attach"}
            </Button>
          </div>
        </div>

        {galleryUploadMut.isError && (
          <p className="text-destructive text-sm">Upload failed.</p>
        )}

        {post.media.length === 0 ? (
          <p className="text-sm text-muted-foreground">No images attached to gallery.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {post.media.map((m) => (
              <div
                key={m.id}
                className="group relative rounded-lg border overflow-hidden bg-muted/20"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(m.path)}
                  alt={m.original_name}
                  className="aspect-square w-full object-cover"
                />
                <div className="p-1.5">
                  <p className="text-xs text-muted-foreground truncate">
                    {m.original_name}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="icon-xs"
                  onClick={() => setConfirmMediaId(m.id)}
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    <ConfirmDialog
      open={confirmMediaId !== null}
      title="Delete this image?"
      description="It will be removed from the gallery and deleted permanently."
      onConfirm={() => confirmMediaId && deleteMediaMut.mutate(confirmMediaId)}
      onCancel={() => setConfirmMediaId(null)}
    />
    </>
  );
}
