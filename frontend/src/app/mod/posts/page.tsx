"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listPosts,
  publishPost,
  unpublishPost,
  archivePost,
  deletePost,
} from "@/lib/api/client";
import { useToken } from "@/components/mod/token-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { PostListItem } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PUBLISHED: "default",
  DRAFT: "outline",
  ARCHIVE: "secondary",
};

export default function PostsPage() {
  const token = useToken();
  const qc = useQueryClient();

  // No post_status filter — backend returns all statuses when omitted
  const {
    data: posts = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["posts", "admin"],
    queryFn: () => listPosts({}, { token }),
  });

  const publishMut = useMutation({
    mutationFn: (id: string) => publishPost(id, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const unpublishMut = useMutation({
    mutationFn: (id: string) => unpublishPost(id, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => archivePost(id, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePost(id, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  function handleDelete(post: PostListItem) {
    if (!confirm(`Delete "${post.title}"?`)) return;
    deleteMut.mutate(post.id);
  }

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (isError) return <p className="text-destructive">Failed to load posts.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Link
          href="/mod/posts/new"
          className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
        >
          <Plus className="size-4" />
          New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">No posts yet.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Title
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">
                  Published
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-60">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className="font-medium">{post.title}</span>
                    {post.tags.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {post.tags.map((t) => t.name).join(", ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{post.type}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[post.status] ?? "outline"}>
                      {post.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/mod/posts/${post.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                      >
                        <Pencil className="size-3.5" />
                      </Link>
                      {post.status === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => publishMut.mutate(post.id)}
                          disabled={publishMut.isPending}
                        >
                          Publish
                        </Button>
                      )}
                      {post.status === "PUBLISHED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unpublishMut.mutate(post.id)}
                          disabled={unpublishMut.isPending}
                        >
                          Unpublish
                        </Button>
                      )}
                      {post.status !== "ARCHIVE" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => archiveMut.mutate(post.id)}
                          disabled={archiveMut.isPending}
                        >
                          Archive
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(post)}
                        disabled={deleteMut.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
