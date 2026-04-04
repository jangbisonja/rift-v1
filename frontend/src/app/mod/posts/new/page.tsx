"use client";

import { useMutation } from "@tanstack/react-query";
import { createPost } from "@/lib/api/client";
import { useToken } from "@/components/mod/token-context";
import { PostForm } from "@/components/mod/post-form";
import { useRouter } from "next/navigation";
import type { PostCreate } from "@/lib/schemas";

export default function NewPostPage() {
  const token = useToken();
  const router = useRouter();

  const { mutateAsync, isPending, isError } = useMutation({
    mutationFn: (data: PostCreate) => createPost(data, token),
  });

  async function handleSubmit(data: PostCreate) {
    const post = await mutateAsync(data);
    router.push(`/mod/posts/${post.id}`);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">New post</h1>
      {isError && (
        <p className="text-destructive text-sm">Failed to create post. Please try again.</p>
      )}
      <PostForm onSubmit={handleSubmit} isSubmitting={isPending} submitLabel="Create post" />
    </div>
  );
}
