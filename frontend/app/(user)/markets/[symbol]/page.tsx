import type { Metadata } from "next";
import { getSeoMeta, buildMetadata, SITE_URL } from "@/helpers/seo";
import { webPageJsonLd } from "@/helpers/jsonLd";
import { getTradingViewSymbol } from "@/helpers/tradingviewSymbols";
import JsonLd from "@/components/JsonLd";
import MarketSymbolClient from "./MarketSymbolClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const tvInfo = getTradingViewSymbol(symbol);
  const seo = await getSeoMeta("markets_symbol", { symbol: tvInfo?.displayName ?? symbol }, symbol);
  return await buildMetadata(seo, { alternates: { canonical: `${SITE_URL}/markets/${symbol}` } });
}

export default async function Page({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const tvInfo = getTradingViewSymbol(symbol);

  return (
    <>
      {tvInfo && (
        <JsonLd
          data={webPageJsonLd({
            name: `${tvInfo.displayName} Price & Chart`,
            description: `Live ${tvInfo.displayName} price, chart and technical analysis on CBFX.`,
            path: `/markets/${symbol}`,
          })}
        />
      )}
      <MarketSymbolClient params={params} />
    </>
  );
}
