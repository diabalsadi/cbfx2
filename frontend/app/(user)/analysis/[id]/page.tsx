import type { Metadata } from "next";
import { getSeoMeta, buildMetadata, SITE_URL } from "@/helpers/seo";
import { articleJsonLd } from "@/helpers/jsonLd";
import { BACKEND_URL } from "@/helpers/backendUrl";
import JsonLd from "@/components/JsonLd";
import AnalysisDetailClient from "./AnalysisDetailClient";

interface ArticleData {
  title: string;
  excerpt?: string;
  cover_image_url?: string;
  created_at: string;
  updated_at: string;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  og_image?: string | null;
}

async function fetchArticle(id: string): Promise<ArticleData | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/public/analysis/${id}`, { next: { revalidate: 60 } });
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
  const article = await fetchArticle(id);
  const seo = await getSeoMeta("analysis_detail", { title: article?.title ?? "Technical Analysis" });
  // Per-article overrides (set in the article's own admin form) win over the
  // generic analysis_detail template.
  if (article?.meta_title) seo.title = article.meta_title;
  if (article?.meta_description) seo.description = article.meta_description;
  if (article?.meta_keywords) seo.keywords = article.meta_keywords;
  if (article?.og_image) seo.og_image = article.og_image;
  return await buildMetadata(seo, { alternates: { canonical: `${SITE_URL}/analysis/${id}` } });
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await fetchArticle(id);

  return (
    <>
      {article && (
        <JsonLd
          data={articleJsonLd({
            headline: article.title,
            description: article.excerpt,
            image: article.cover_image_url,
            datePublished: article.created_at,
            dateModified: article.updated_at,
            path: `/analysis/${id}`,
          })}
        />
      )}
      <AnalysisDetailClient params={params} />
    </>
  );
}
