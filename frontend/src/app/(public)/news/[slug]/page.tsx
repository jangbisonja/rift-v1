import { notFound } from "next/navigation";
import { listPosts } from "@/lib/api/client";
import { PostDetail } from "@/components/post-detail";

export const revalidate = 60;

interface Props { params: Promise<{ slug: string }> }

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;
  try {
    const results = await listPosts({ slug, post_status: "PUBLISHED" });
    const post = results[0];
    if (!post) notFound();
    // Fetch full post (includes content)
    const { getPost } = await import("@/lib/api/client");
    const full = await getPost(post.id);
    return <PostDetail post={full} />;
  } catch {
    notFound();
  }
}
