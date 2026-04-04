"use client";

import { useState } from "react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/mod/confirm-dialog";
import Link from "next/link";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { PostListItem } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

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
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ id: string; title: string } | null>(null);

  const { data: posts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["posts", "admin", page],
    queryFn: () =>
      listPosts({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }, { token }),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      setConfirm(null);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-32 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3 py-8">
        <p className="text-destructive">Failed to load posts.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
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

        {posts.length === 0 && page === 0 ? (
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
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon-sm" }),
                          )}
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
                          onClick={() =>
                            setConfirm({ id: post.id, title: post.title })
                          }
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

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={posts.length < PAGE_SIZE}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={`Delete "${confirm?.title}"?`}
        description="This cannot be undone."
        onConfirm={() => confirm && deleteMut.mutate(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
