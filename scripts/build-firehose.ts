/**
 * Builds public/firehose.json — every signal (official updates, press, papers, community) in one compact,
 * client-fetched file for the /firehose page. Runs automatically as part of `prebuild`.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { dataTime, getAllItems, getPapers, getPress, getPulse, getSocial, getStatus, toFeedItem } from "../src/lib/data";
import type { FirehoseRow } from "../src/lib/types";

const rows: FirehoseRow[] = [];

for (const i of getAllItems()) {
  rows.push({ i: `o-${i.id}`, s: "official", l: i.lab, t: i.title, u: i.url, a: i.publishedAt, c: i.category, w: i.sourceName, m: i.importance, ...(i.verified ? { v: 1 as const } : {}) });
}
for (const p of getPress()) {
  rows.push({ i: `p-${p.id}`, s: "press", l: p.lab, t: p.title, u: p.url, a: p.publishedAt, w: p.outlets.length > 1 ? `${p.outlet} +${p.outlets.length - 1}` : p.outlet, m: p.reports, x: p.reports });
}
for (const p of getPapers()) {
  rows.push({ i: `r-${p.id}`, s: "paper", l: p.lab ?? "", t: p.title, u: p.url, a: p.submittedAt, w: p.org ?? "Hugging Face Papers", m: p.upvotes });
}
for (const c of getPulse()) {
  rows.push({ i: `c-${c.id}`, s: "community", l: c.lab ?? "", t: c.title, u: c.url, a: c.at, w: "Hacker News", m: c.points, x: c.comments });
}

for (const p of getSocial()) {
  rows.push({ i: `x-${p.id}`, s: "social", l: p.lab ?? "", t: p.text || `${p.platform === "x" ? "Post on X" : "Post on Threads"} by @${p.handle}`, u: p.url, a: p.at, w: `@${p.handle}`, m: p.likes ?? 0, ...(p.official ? { v: 1 as const } : {}) });
}

rows.sort((a, b) => b.a.localeCompare(a.a));
const out = join(process.cwd(), "public", "firehose.json");
writeFileSync(out, JSON.stringify({ generatedAt: getStatus()?.generatedAt ?? null, rows }));
const counts = rows.reduce<Record<string, number>>((n, r) => ({ ...n, [r.s]: (n[r.s] ?? 0) + 1 }), {});
// Items 8–30 days old for the Today feed's "30 Days" range — fetched on demand so the home page stays light.
const ref = dataTime();
const older = getAllItems()
  .filter((i) => ref - Date.parse(i.publishedAt) >= 7 * 86_400_000 && ref - Date.parse(i.publishedAt) < 30 * 86_400_000)
  .map(toFeedItem);
writeFileSync(join(process.cwd(), "public", "feed-older.json"), JSON.stringify(older));
console.log(`firehose: ${rows.length} rows ${JSON.stringify(counts)} → public/firehose.json`);
