import { notFound } from "next/navigation";
import { listPosts, getPost } from "@/lib/api/client";
import { PostDetail } from "@/components/post-detail";

export const revalidate = 60;

interface Props { params: Promise<{ slug: string }> }

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  try {
    const results = await listPosts({ slug, post_status: "PUBLISHED" });
    const item = results[0];
    if (!item) notFound();
    const post = await getPost(item.id);
    return <PostDetail post={post} />;
  } catch {
    notFound();
  }
}
