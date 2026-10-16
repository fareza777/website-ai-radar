import { getAllItems, getStatus } from "@/lib/data";
import { atomFeed } from "@/lib/feeds";
import { SITE, siteUrl } from "@/lib/site";

export function GET() {
  const base = siteUrl();
  const body = atomFeed(
    { title: `${SITE.name} — all labs`, subtitle: SITE.description, self: `${base}/feed.xml`, home: base, updated: getStatus()?.generatedAt ?? "1970-01-01T00:00:00.000Z" },
    getAllItems().slice(0, 120),
  );
  return new Response(body, { headers: { "content-type": "application/atom+xml; charset=utf-8" } });
}
