"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPost,
  updatePost,
  uploadMedia,
  attachMedia,
  deleteMedia,
} from "@/lib/api/client";
import { useToken } from "@/components/mod/token-context";
import { PostForm } from "@/components/mod/post-form";
import { useParams } from "next/navigation";
import type { PostCreate } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mediaUrl } from "@/lib/media";
import { Trash2, Upload } from "lucide-react";
import { useRef } from "react";

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    },
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const m = await uploadMedia(file, token);
      return attachMedia(m.id, id, token);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post", id] }),
  });

  const deleteMediaMut = useMutation({
    mutationFn: (mediaId: string) => deleteMedia(mediaId, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post", id] }),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMut.mutate(file);
    e.target.value = "";
  }

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (isError || !post) return <p className="text-destructive">Post not found.</p>;

  const defaultValues: Partial<PostCreate> = {
    title: post.title,
    type: post.type,
    content: post.content,
    post_metadata: post.post_metadata,
    tag_ids: post.tags.map((t) => t.id),
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Edit post</h1>
        <Badge variant="outline">{post.status}</Badge>
      </div>

      {updateMut.isError && (
        <p className="text-destructive text-sm">Failed to save. Please try again.</p>
      )}
      {updateMut.isSuccess && (
        <p className="text-sm text-muted-foreground">Saved.</p>
      )}

      <PostForm
        key={post.id}
        defaultValues={defaultValues}
        onSubmit={async (data) => {
          await updateMut.mutateAsync(data);
        }}
        isSubmitting={updateMut.isPending}
        submitLabel="Save changes"
      />

      {/* ── Media ────────────────────────────────────────────── */}
      <div className="border-t pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Media</h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMut.isPending}
            >
              <Upload className="size-4" />
              {uploadMut.isPending ? "Uploading…" : "Upload & attach"}
            </Button>
          </div>
        </div>

        {uploadMut.isError && (
          <p className="text-destructive text-sm">Upload failed.</p>
        )}

        {post.media.length === 0 ? (
          <p className="text-sm text-muted-foreground">No media attached.</p>
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
                  onClick={() => deleteMediaMut.mutate(m.id)}
                  disabled={deleteMediaMut.isPending}
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
  );
}
