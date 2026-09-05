import type { Metadata } from "next";
import { getSeoMeta, buildMetadata } from "@/helpers/seo";
import { organizationJsonLd, websiteJsonLd } from "@/helpers/jsonLd";
import JsonLd from "@/components/JsonLd";
import HomeClient from "./HomeClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = await getSeoMeta("homepage", locale);
  return await buildMetadata(seo, locale);
}

export default function Page() {
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <HomeClient />
    </>
  );
}
