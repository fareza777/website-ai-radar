import { jsonLdString } from "@/lib/seo";

/** Inline structured data (rendered on the server, invisible to users). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}
