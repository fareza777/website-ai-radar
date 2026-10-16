import { notFound } from "next/navigation";
import { getLab, LABS } from "@/config/labs";
import { getLabItems, getStatus } from "@/lib/data";
import { atomFeed } from "@/lib/feeds";
import { siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return LABS.map((l) => ({ slug: l.slug }));
}

export async function GET(_req: Request, ctx: RouteContext<"/labs/[slug]/feed.xml">) {
  const { slug } = await ctx.params;
  const lab = getLab(slug);
  if (!lab) notFound();
  const base = siteUrl();
  const body = atomFeed(
    { title: `${lab.name} — AI Radar`, subtitle: `${lab.tagline} — official updates`, self: `${base}/labs/${slug}/feed.xml`, home: `${base}/labs/${slug}`, updated: getStatus()?.generatedAt ?? "1970-01-01T00:00:00.000Z" },
    getLabItems(slug).slice(0, 80),
  );
  return new Response(body, { headers: { "content-type": "application/atom+xml; charset=utf-8" } });
}
