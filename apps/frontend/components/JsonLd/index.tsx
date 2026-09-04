// Renders one or more JSON-LD structured-data blocks. Server component —
// safe to render directly inside a page's Server Component alongside
// generateMetadata(), so the <script> tag is present in the initial HTML
// for crawlers.
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON.stringify never escapes "<", so a value containing a
          // literal "</script>" (e.g. user-generated content embedded in
          // structured data) would otherwise close this tag early and let
          // an attacker-controlled <script> that follows execute — this is
          // baked into the server-rendered HTML, so the browser's HTML
          // parser sees it before any React/DOM escaping ever applies.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  );
}
