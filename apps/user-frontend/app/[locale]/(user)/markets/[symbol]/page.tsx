import type { Metadata } from "next";
import { getSeoMeta, buildMetadata, localizedAlternates } from "@/helpers/seo";
import { webPageJsonLd } from "@/helpers/jsonLd";
import { getTradingViewSymbol } from "@/helpers/tradingviewSymbols";
import JsonLd from "@/components/JsonLd";
import MarketSymbolClient from "./MarketSymbolClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; symbol: string }>;
}): Promise<Metadata> {
  const { locale, symbol } = await params;
  const tvInfo = getTradingViewSymbol(symbol);
  const seo = await getSeoMeta("markets_symbol", locale, { symbol: tvInfo?.displayName ?? symbol }, symbol);
  return await buildMetadata(seo, locale, { alternates: localizedAlternates(`/markets/${symbol}`, locale) });
}

export default async function Page({ params }: { params: Promise<{ locale: string; symbol: string }> }) {
  const { locale, symbol } = await params;
  const tvInfo = getTradingViewSymbol(symbol);

  return (
    <>
      {tvInfo && (
        <JsonLd
          data={webPageJsonLd({
            name: `${tvInfo.displayName} Price & Chart`,
            description: `Live ${tvInfo.displayName} price, chart and technical analysis on CBFX.`,
            path: `/${locale}/markets/${symbol}`,
          })}
        />
      )}
      <MarketSymbolClient params={params} />
    </>
  );
}
