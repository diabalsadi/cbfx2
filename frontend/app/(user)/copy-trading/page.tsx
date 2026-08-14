import type { Metadata } from "next";
import { getSeoMeta, buildMetadata } from "@/helpers/seo";
import { webPageJsonLd } from "@/helpers/jsonLd";
import JsonLd from "@/components/JsonLd";
import CopyTradingClient from "./CopyTradingClient";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMeta("copy_trading");
  return await buildMetadata(seo);
}

export default async function Page() {
  const seo = await getSeoMeta("copy_trading");
  return (
    <>
      <JsonLd data={webPageJsonLd({ name: seo.title, description: seo.description, path: seo.canonical_path ?? "/copy-trading" })} />
      <CopyTradingClient />
    </>
  );
}
