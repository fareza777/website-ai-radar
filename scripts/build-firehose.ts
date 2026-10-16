/**
 * Builds public/firehose.json — every signal (official updates, press, papers, community) in one compact,
 * client-fetched file for the /firehose page. Runs automatically as part of `prebuild`.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { dataTime, getAllItems, getStatus, toFeedItem } from "../src/lib/data";
import { buildFirehoseRows } from "../src/lib/firehose";

const rows = buildFirehoseRows();
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
