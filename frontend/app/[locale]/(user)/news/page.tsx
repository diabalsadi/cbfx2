import type { Metadata } from "next";
import { getSeoMeta, buildMetadata } from "@/helpers/seo";
import { webPageJsonLd } from "@/helpers/jsonLd";
import JsonLd from "@/components/JsonLd";
import NewsClient from "./NewsClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = await getSeoMeta("news", locale);
  return await buildMetadata(seo, locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const seo = await getSeoMeta("news", locale);
  return (
    <>
      <JsonLd data={webPageJsonLd({ name: seo.title, description: seo.description, path: `/${locale}${seo.canonical_path ?? "/news"}` })} />
      <NewsClient />
    </>
  );
}
