// Renders one or more JSON-LD structured-data blocks. Server component —
// safe to render directly inside a page's Server Component alongside
// generateMetadata(), so the <script> tag is present in the initial HTML
// for crawlers.
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
      ))}
    </>
  );
}
