import type { Metadata } from "next";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare Brokers",
  description: "Compare two brokers side by side — cashback rate, spreads, account types, and more.",
};

export default function Page() {
  return <CompareClient />;
}
