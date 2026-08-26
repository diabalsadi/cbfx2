"use client";

import { use } from "react";
import ArticleReader from "@/components/ArticleReader";
import { articlesApi } from "@/helpers/api";

export default function AnalysisArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ArticleReader
      section="analysis"
      articleId={id}
      getArticle={articlesApi.getAnalysis}
    />
  );
}
