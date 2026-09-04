import type { Metadata } from "next";
import { getSeoMeta, buildMetadata } from "@/helpers/seo";
import { webPageJsonLd } from "@/helpers/jsonLd";
import JsonLd from "@/components/JsonLd";
import CalendarClient from "./CalendarClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = await getSeoMeta("calendar", locale);
  return await buildMetadata(seo, locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const seo = await getSeoMeta("calendar", locale);
  return (
    <>
      <JsonLd data={webPageJsonLd({ name: seo.title, description: seo.description, path: `/${locale}${seo.canonical_path ?? "/calendar"}` })} />
      <CalendarClient />
    </>
  );
}
