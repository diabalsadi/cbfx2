"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import styles from "./markets.module.scss";
import { MARKETS, type MarketEntry, type MarketTab } from "@/data/marketSymbols";

const SymbolChart = dynamic(() => import("@/components/SymbolChart"), {
  ssr: false,
});

type Tab = MarketTab;

type SelectedSymbol = MarketEntry | null;

export default function MarketsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Forex");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedSymbol>(null);

  const tabs: Tab[] = ["Forex", "Crypto", "Metals", "Indices"];

  const filtered = MARKETS[activeTab].filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Markets</h1>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            className={styles.search}
            placeholder="Search symbol…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            No symbols match &ldquo;{search}&rdquo;
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.name}
              className={styles.row}
              onClick={() => setSelected(m)}
            >
              <div className={styles.rowLeft}>
                <div className={styles.symbolBadge}>{m.symbol}</div>
                <div>
                  <div className={styles.symbolName}>{m.name}</div>
                  <div className={styles.symbolMeta}>Spot · Live</div>
                </div>
              </div>
              <div className={styles.rowRight}>
                <div className={styles.symbolPrice}>{m.price}</div>
                <div
                  className={`${styles.symbolChange} ${m.up ? styles.up : styles.down}`}
                >
                  {m.up ? "↗" : "↘"} {m.change}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <SymbolChart
          symbol={selected.symbol}
          name={selected.name}
          price={selected.price}
          change={selected.change}
          up={selected.up}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
