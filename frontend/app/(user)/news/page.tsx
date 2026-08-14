import type { Metadata } from "next";
import { getSeoMeta, buildMetadata } from "@/helpers/seo";
import { webPageJsonLd } from "@/helpers/jsonLd";
import JsonLd from "@/components/JsonLd";
import NewsClient from "./NewsClient";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMeta("news");
  return await buildMetadata(seo);
}

export default async function Page() {
  const seo = await getSeoMeta("news");
  return (
    <>
      <JsonLd data={webPageJsonLd({ name: seo.title, description: seo.description, path: seo.canonical_path ?? "/news" })} />
      <NewsClient />
    </>
  );
}
