"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listMedia, uploadMedia, deleteMedia } from "@/lib/api/client";
import { useToken } from "@/components/mod/token-context";
import { mediaUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import type { Media } from "@/lib/schemas";

export default function MediaPage() {
  const token = useToken();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["media"],
    queryFn: () => listMedia({}, token),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadMedia(file, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMedia(id, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media"] }),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMut.mutate(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Media</h1>
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
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMut.isPending}
          >
            <Upload className="size-4" />
            {uploadMut.isPending ? "Uploading…" : "Upload image"}
          </Button>
        </div>
      </div>

      {uploadMut.isError && (
        <p className="text-destructive text-sm">Upload failed. Please try again.</p>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : media.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No media uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {media.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onDelete={() => deleteMut.mutate(item.id)}
              deleting={deleteMut.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MediaCard({
  item,
  onDelete,
  deleting,
}: {
  item: Media;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="group relative rounded-lg border overflow-hidden bg-muted/20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaUrl(item.path)}
        alt={item.original_name}
        className="aspect-square w-full object-cover"
      />
      <div className="p-2">
        <p className="text-xs text-muted-foreground truncate">{item.original_name}</p>
        {item.post_id && (
          <p className="text-xs text-muted-foreground">Attached</p>
        )}
      </div>
      <Button
        variant="destructive"
        size="icon-xs"
        onClick={onDelete}
        disabled={deleting}
        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  );
}
