import type { Metadata } from "next";
import { getSeoMeta, buildMetadata, localizedAlternates } from "@/helpers/seo";
import { webPageJsonLd } from "@/helpers/jsonLd";
import { BACKEND_URL } from "@/helpers/backendUrl";
import JsonLd from "@/components/JsonLd";
import BrokerDetailClient from "./BrokerDetailClient";

interface BrokerData {
  name: string;
}

async function fetchBroker(id: string): Promise<BrokerData | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/public/brokers/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const broker = await fetchBroker(id);
  const seo = await getSeoMeta("brokers_detail", locale, { title: broker?.name ?? "Broker" });
  return await buildMetadata(seo, locale, { alternates: localizedAlternates(`/brokers/${id}`, locale) });
}

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const broker = await fetchBroker(id);

  return (
    <>
      {broker && (
        <JsonLd
          data={webPageJsonLd({
            name: broker.name,
            description: `${broker.name} cashback offer`,
            path: `/${locale}/brokers/${id}`,
          })}
        />
      )}
      <BrokerDetailClient params={params} />
    </>
  );
}
