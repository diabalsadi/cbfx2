import type { Metadata } from "next";
import { Suspense } from "react";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare Brokers",
  description: "Compare two brokers side by side — cashback rate, spreads, account types, and more.",
};

export default function Page() {
  // CompareClient reads useSearchParams() so it can react to the ?a=/?b=
  // query changing without a full remount (see CompareClient.tsx) — Next.js
  // requires that hook's nearest usage to sit inside a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <CompareClient />
    </Suspense>
  );
}
