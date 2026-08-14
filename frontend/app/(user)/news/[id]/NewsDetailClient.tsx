"use client";

import { use } from "react";
import ArticleReader from "@/components/ArticleReader";
import { newsApi } from "@/helpers/api";

export default function NewsArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ArticleReader section="news" articleId={id} getArticle={newsApi.get} />
  );
}
