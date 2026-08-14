import type { Metadata } from "next";
import { getSeoMeta, buildMetadata } from "@/helpers/seo";
import { webPageJsonLd } from "@/helpers/jsonLd";
import JsonLd from "@/components/JsonLd";
import RegisterClient from "./RegisterClient";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMeta("register");
  return await buildMetadata(seo);
}

export default async function Page() {
  const seo = await getSeoMeta("register");
  return (
    <>
      <JsonLd data={webPageJsonLd({ name: seo.title, description: seo.description, path: seo.canonical_path ?? "/register" })} />
      <RegisterClient />
    </>
  );
}
