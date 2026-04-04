"use client";

import { useMutation } from "@tanstack/react-query";
import { createPost } from "@/lib/api/client";
import { useToken } from "@/components/mod/token-context";
import { useToast } from "@/components/toast-provider";
import { PostForm } from "@/components/mod/post-form";
import { Breadcrumbs } from "@/components/mod/breadcrumbs";
import { useRouter } from "next/navigation";
import type { PostCreate } from "@/lib/schemas";

export default function NewPostPage() {
  const token = useToken();
  const router = useRouter();
  const { toast } = useToast();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: PostCreate) => createPost(data, token),
    onError: () => toast("Failed to create post. Please try again.", "error"),
  });

  async function handleSubmit(data: PostCreate) {
    const post = await mutateAsync(data);
    router.push(`/mod/posts/${post.id}`);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumbs items={[{ label: "Posts", href: "/mod/posts" }, { label: "New post" }]} />
      <h1 className="text-2xl font-bold">New post</h1>
      <PostForm onSubmit={handleSubmit} isSubmitting={isPending} submitLabel="Create post" />
    </div>
  );
}
