import type { Metadata } from "next";
import { getSeoMeta, buildMetadata } from "@/helpers/seo";
import { webPageJsonLd } from "@/helpers/jsonLd";
import JsonLd from "@/components/JsonLd";
import PlaysClient from "./PlaysClient";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMeta("plays");
  return await buildMetadata(seo);
}

export default async function Page() {
  const seo = await getSeoMeta("plays");
  return (
    <>
      <JsonLd data={webPageJsonLd({ name: seo.title, description: seo.description, path: seo.canonical_path ?? "/plays" })} />
      <PlaysClient />
    </>
  );
}
