import { LABS } from "@/config/labs";
import { SITE, siteUrl } from "@/lib/site";

/** /llms.txt — a plain-text map of the site for AI assistants and crawlers (https://llmstxt.org). */
export function GET() {
  const base = siteUrl();
  const body = `# ${SITE.name} — ${SITE.tagline}

> ${SITE.description}

AI Radar is an automated tracker of ${LABS.length} AI labs. A collector runs every 3 hours and reads official blogs, RSS feeds,
changelogs, GitHub releases and Hugging Face. Nothing is invented: every item links to its original source, and press, social and
community items are never marked verified unless they come from a lab's own account.

## Main pages
- [Today](${base}/): briefing, top stories, live radar and the latest updates
- [AI Labs](${base}/labs): the ${LABS.length} tracked labs, each with an update timeline
- [Discover](${base}/discover): new AI tools, agents and startups
- [Deals & free credits](${base}/deals): free tiers and credits, with verification status and evidence
- [Models & prices](${base}/models): per-token pricing and price moves
- [Weekly digest](${base}/digest): the week in AI on one page
- [Firehose](${base}/firehose): every signal in one searchable table
- [Status](${base}/status): the health and coverage of every data source

## Machine-readable
- [Atom feed](${base}/feed.xml) and [JSON feed](${base}/feed.json): latest updates across all labs
- Per-lab Atom feeds: ${base}/labs/<lab>/feed.xml
- [Sitemap](${base}/sitemap.xml)

## Labs
${LABS.map((l) => `- [${l.name}](${base}/labs/${l.slug}): ${l.tagline}`).join("\n")}
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
