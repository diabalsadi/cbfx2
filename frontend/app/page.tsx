import type { Metadata } from "next";
import { getSeoMeta, buildMetadata } from "@/helpers/seo";
import { organizationJsonLd, websiteJsonLd } from "@/helpers/jsonLd";
import JsonLd from "@/components/JsonLd";
import HomeClient from "./HomeClient";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMeta("homepage");
  return await buildMetadata(seo);
}

export default function Page() {
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <HomeClient />
    </>
  );
}
