import type { Metadata } from "next";
import { getSeoMeta, buildMetadata, SITE_URL } from "@/helpers/seo";
import { discussionForumPostingJsonLd } from "@/helpers/jsonLd";
import { BACKEND_URL } from "@/helpers/backendUrl";
import JsonLd from "@/components/JsonLd";
import ForumThreadClient from "./ForumThreadClient";

interface ThreadData {
  title: string;
  body?: string;
  author_email: string;
  reply_count: number;
  created_at: string;
}

async function fetchThread(id: string): Promise<ThreadData | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/forum/threads/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const thread = await fetchThread(id);
  const seo = await getSeoMeta("forum_detail", { title: thread?.title ?? "Discussion" });
  return await buildMetadata(seo, { alternates: { canonical: `${SITE_URL}/forum/${id}` } });
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thread = await fetchThread(id);

  return (
    <>
      {thread && (
        <JsonLd
          data={discussionForumPostingJsonLd({
            headline: thread.title,
            text: thread.body,
            datePublished: thread.created_at,
            authorName: thread.author_email.split("@")[0],
            replyCount: thread.reply_count,
            path: `/forum/${id}`,
          })}
        />
      )}
      <ForumThreadClient params={params} />
    </>
  );
}
