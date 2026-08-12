"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import styles from "./SymbolChart.module.scss";
import { symbolHref } from "@/helpers/tradingviewSymbols";

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1D";

interface SymbolChartProps {
  symbol: string;
  name: string;
  price: string;
  change: string;
  up: boolean;
  onClose: () => void;
}

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1D"];

/** Seeded pseudo-random so each symbol always gets the same curve shape */
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generatePrices(
  basePrice: number,
  points: number,
  volatility: number,
  seed: number,
) {
  const rand = seededRand(seed);
  const prices: number[] = [basePrice];
  for (let i = 1; i < points; i++) {
    const change = (rand() - 0.48) * volatility;
    prices.push(Math.max(prices[i - 1] + change, basePrice * 0.97));
  }
  return prices;
}

function buildSvgPath(
  prices: number[],
  w: number,
  h: number,
  pad = 16,
): string {
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p - min) / range) * (h - pad * 2);
    return [x, y] as [number, number];
  });

  // Catmull-Rom → cubic bezier
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function buildAreaPath(
  prices: number[],
  w: number,
  h: number,
  pad = 16,
): string {
  const line = buildSvgPath(prices, w, h, pad);
  const lastX = pad + (w - pad * 2);
  const firstX = pad;
  return `${line} L ${lastX},${h - pad} L ${firstX},${h - pad} Z`;
}

const POINTS: Record<Timeframe, number> = {
  "1m": 60,
  "5m": 72,
  "15m": 64,
  "1h": 48,
  "4h": 42,
  "1D": 30,
};

export default function SymbolChart({
  symbol,
  name,
  price,
  change,
  up,
  onClose,
}: SymbolChartProps) {
  const [tf, setTf] = useState<Timeframe>("1h");
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 240 });

  // Resize observer
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setDims({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Lock scroll on mount
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const basePriceNum = parseFloat(price.replace(/,/g, ""));
  const volatility = basePriceNum * 0.0012;
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const tfSeed = seed + TIMEFRAMES.indexOf(tf) * 100;
  const prices = generatePrices(basePriceNum, POINTS[tf], volatility, tfSeed);

  const { w, h } = dims;
  const linePath = buildSvgPath(prices, w, h);
  const areaPath = buildAreaPath(prices, w, h);
  const gradId = `grad-${symbol.replace(/\//g, "")}`;

  const sellPrice = (basePriceNum - basePriceNum * 0.00005).toFixed(
    basePriceNum > 100 ? 2 : 4,
  );
  const buyPrice = (basePriceNum + basePriceNum * 0.00005).toFixed(
    basePriceNum > 100 ? 2 : 4,
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.symbolName}>{name}</h2>
            <p className={styles.session}>European Session · Live</p>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.currentPrice}>{price}</span>
            <span
              className={`${styles.priceChange} ${up ? styles.up : styles.down}`}
            >
              {up ? "+" : ""}
              {change}
            </span>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Chart */}
        <div className={styles.chartWrap}>
          <svg
            ref={svgRef}
            className={styles.svg}
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#FF6B00" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradId})`} />
            <path
              d={linePath}
              fill="none"
              stroke="#FF6B00"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Timeframe selector */}
        <div className={styles.tfRow}>
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              className={`${styles.tfBtn} ${tf === t ? styles.tfActive : ""}`}
              onClick={() => setTf(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Full analysis link */}
        <div className={styles.fullAnalysisRow}>
          <Link
            href={symbolHref(name)}
            className={styles.fullAnalysisLink}
            onClick={onClose}
          >
            View full analysis →
          </Link>
        </div>

        {/* Sell / Buy */}
        <div className={styles.tradeRow}>
          <button className={styles.sellBtn}>Sell · {sellPrice}</button>
          <button className={styles.buyBtn}>Buy · {buyPrice}</button>
        </div>
      </div>
    </div>
  );
}
