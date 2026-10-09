/**
 * Builds public/search-index.json for the ⌘K global search (runs automatically as `prebuild`).
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { LABS, LAB_BY_SLUG } from "../src/config/labs";
import { CATEGORY_META } from "../src/lib/categories";
import { getAllItems, getDeals, getDiscover } from "../src/lib/data";
import type { SearchDoc } from "../src/lib/search-types";

const docs: SearchDoc[] = [];

for (const l of LABS) {
  docs.push({
    type: "lab", id: l.slug, title: l.name, sub: l.tagline, text: `${l.tagline} ${l.slug} ${l.website}`.toLowerCase(),
    href: `/labs/${l.slug}`, lab: l.slug, weight: 60,
  });
}

for (const i of getAllItems()) {
  docs.push({
    type: "update", id: i.id, title: i.title,
    sub: `${LAB_BY_SLUG[i.lab]?.name ?? i.lab} · ${CATEGORY_META[i.category].label}`,
    text: `${i.summary} ${i.tags.join(" ")} ${i.category} ${LAB_BY_SLUG[i.lab]?.name ?? ""}`.toLowerCase().slice(0, 400),
    href: i.url, lab: i.lab, date: i.publishedAt, weight: Math.round(i.importance / 5),
  });
}

for (const d of getDiscover()) {
  docs.push({
    type: "discover", id: d.id, title: d.name, sub: `${d.novelty === "new" ? "Baru" : "Trending"} · ${d.description}`.slice(0, 140),
    text: `${d.description} ${(d.topics ?? []).join(" ")} ${d.repo ?? ""}`.toLowerCase().slice(0, 400),
    href: d.url, date: d.createdAt ?? d.firstSeenAt, weight: Math.round(d.score / 5),
  });
}

for (const d of getDeals()) {
  docs.push({
    type: "deal", id: d.id, title: d.title, sub: `${d.provider} · ${d.status}`,
    text: `${d.description} ${d.kind} ${d.provider} gratis free promo`.toLowerCase().slice(0, 300),
    href: d.url, lab: d.lab, date: d.startsAt ?? undefined, weight: d.status === "active" ? 12 : 4,
  });
}

const out = join(process.cwd(), "public", "search-index.json");
writeFileSync(out, JSON.stringify(docs));
console.log(`search index: ${docs.length} docs → public/search-index.json`);
