import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/reset.scss";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { getSeoSettings } from "@/helpers/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Site verification codes are sitewide (one Google/Bing/etc. code per
// domain, not per page) — Next.js merges a layout's metadata into every
// child page's, so setting `verification` here once puts it on every page
// without each of the 17 routes needing to fetch it individually. The
// title/description below are a fallback only — every public route sets
// its own via generateMetadata() (see helpers/seo.ts).
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSeoSettings();
  const other: Record<string, string> = {};
  if (settings.pinterest_site_verification) other["p:domain_verify"] = settings.pinterest_site_verification;
  if (settings.facebook_domain_verification) other["facebook-domain-verification"] = settings.facebook_domain_verification;

  return {
    title: "CBFX",
    description: "Cashback, copy trading, premium trading signals and a live community — all in one cockpit.",
    verification: {
      google: settings.google_site_verification || undefined,
      other: {
        ...(settings.bing_site_verification ? { "msvalidate.01": settings.bing_site_verification } : {}),
        ...other,
      },
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* No hand-written <head> here on purpose: Next.js manages <head> itself
          from the metadata API (this file's `metadata` export, plus every
          route's generateMetadata()). A literal <head> tag in the root layout
          conflicts with that and was pushing all metadata — title, OG tags,
          canonical, robots — into <body> instead. */}
      <body className={inter.variable} suppressHydrationWarning>
        {/* Blocking script: runs before paint to prevent theme flash.
            beforeInteractive scripts are injected into <head> by Next.js
            itself regardless of where the component is written. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function() {
              try {
                var t = localStorage.getItem('cbfx_theme');
                document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
              } catch(e) {
                document.documentElement.setAttribute('data-theme', 'dark');
              }
            })();
          `}
        </Script>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
