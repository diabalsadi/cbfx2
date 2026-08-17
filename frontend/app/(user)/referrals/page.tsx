import type { Metadata } from "next";
import { getSeoMeta, buildMetadata } from "@/helpers/seo";
import { webPageJsonLd } from "@/helpers/jsonLd";
import JsonLd from "@/components/JsonLd";
import ReferralsClient from "./ReferralsClient";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMeta("referrals");
  return await buildMetadata(seo);
}

export default async function Page() {
  const seo = await getSeoMeta("referrals");
  return (
    <>
      <JsonLd data={webPageJsonLd({ name: seo.title, description: seo.description, path: seo.canonical_path ?? "/referrals" })} />
      <ReferralsClient />
    </>
  );
}
