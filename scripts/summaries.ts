/**
 * Editorial summaries workflow for the daily Cursor run.
 *
 *   npm run summaries:pending            # write summaries/pending.json (what still needs writing)
 *   npm run summaries:check              # validate summaries/*.json (exit 1 on invalid content)
 *   npm run summaries:check -- --prune   # also drop entries for items that no longer exist
 *
 * The agent writes ONLY summaries/updates.json, summaries/discover.json, summaries/briefing.json.
 * The website overlays valid entries at build time; invalid or stale ones are ignored.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LAB_BY_SLUG, LABS } from "../src/config/labs";
import { getRawBriefings, getRawDiscover, getRawLabItems } from "../src/lib/data";
import {
  briefingSummaryProblem,
  discoverSummaryProblem,
  updateSummaryProblem,
  type SummaryFiles,
} from "../src/lib/summaries";
import type { UpdateItem } from "../src/lib/types";

const DIR = join(process.cwd(), "summaries");
const read = <T>(f: string): T => JSON.parse(readFileSync(join(DIR, f), "utf8")) as T;
const files = (): SummaryFiles => ({ updates: read("updates.json"), discover: read("discover.json"), briefing: read("briefing.json") });
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const allItems = (): UpdateItem[] => LABS.flatMap((l) => getRawLabItems(l.slug));

function pending() {
  const limit = Number(arg("limit") ?? 60);
  const days = Number(arg("days") ?? 14);
  const f = files();
  const items = allItems();
  const byId = new Map(items.map((i) => [i.id, i]));
  const ref = Math.max(...items.map((i) => Date.parse(i.publishedAt)));
  const since = ref - days * 86_400_000;

  const updates = items
    .filter((i) => Date.parse(i.publishedAt) >= since && (!f.updates[i.id] || updateSummaryProblem(f.updates[i.id], i)))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, limit)
    .map((i) => ({
      id: i.id,
      hash: i.contentHash,
      lab: LAB_BY_SLUG[i.lab]?.name ?? i.lab,
      title: i.title,
      excerpt: i.excerpt,
      source: i.sourceName,
      url: i.url,
      category: i.category,
      publishedAt: i.publishedAt,
    }));

  const discover = getRawDiscover()
    .filter((d) => !f.discover[d.id] || discoverSummaryProblem(f.discover[d.id], d))
    .slice(0, Number(arg("discover") ?? 25))
    .map((d) => ({ id: d.id, name: d.name, kind: d.kind, url: d.url, description: d.description, topics: d.topics ?? [], stars: d.stars ?? null, xPost: d.quote?.text ?? null }));

  const latest = getRawBriefings()[0];
  let briefing = null;
  if (latest && (!f.briefing[latest.date] || briefingSummaryProblem(f.briefing[latest.date], byId, latest.stats))) {
    const window = items.filter((i) => Date.parse(i.publishedAt) >= Date.parse(latest.generatedAt) - 72 * 3_600_000);
    briefing = {
      date: latest.date,
      stats: latest.stats,
      candidates: window
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 15)
        .map((i) => ({ itemId: i.id, lab: LAB_BY_SLUG[i.lab]?.name ?? i.lab, title: i.title, excerpt: i.excerpt })),
    };
  }

  const out = {
    generatedFrom: "npm run summaries:pending",
    instructions: "Write entries into summaries/updates.json (key = id, include hash), summaries/discover.json (key = id), summaries/briefing.json (key = date). Then run npm run summaries:check. See .cursor/rules/daily-update.mdc.",
    updates,
    discover,
    briefing,
  };
  writeFileSync(join(DIR, "pending.json"), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`pending: ${updates.length} updates · ${discover.length} discover · briefing ${briefing ? briefing.date : "done"} → summaries/pending.json`);
}

function check() {
  const prune = process.argv.includes("--prune");
  const f = files();
  const items = allItems();
  const byId = new Map(items.map((i) => [i.id, i]));
  const discoverById = new Map(getRawDiscover().map((d) => [d.id, d]));
  const briefings = new Map(getRawBriefings().map((b) => [b.date, b]));
  const errors: string[] = [];
  const warnings: string[] = [];
  let valid = 0;

  for (const [id, e] of Object.entries(f.updates)) {
    const p = updateSummaryProblem(e, byId.get(id));
    if (!p) valid++;
    else if (p === "unknown item id" || p.startsWith("stale")) {
      warnings.push(`updates/${id}: ${p}`);
      if (prune && p === "unknown item id") delete f.updates[id];
    } else errors.push(`updates/${id}: ${p}`);
  }
  for (const [id, e] of Object.entries(f.discover)) {
    const p = discoverSummaryProblem(e, discoverById.get(id));
    if (!p) valid++;
    else if (p === "unknown discover id") {
      warnings.push(`discover/${id}: ${p}`);
      if (prune) delete f.discover[id];
    } else errors.push(`discover/${id}: ${p}`);
  }
  for (const [date, e] of Object.entries(f.briefing)) {
    const b = briefings.get(date);
    if (!b) {
      warnings.push(`briefing/${date}: no briefing for this date`);
      if (prune) delete f.briefing[date];
      continue;
    }
    const p = briefingSummaryProblem(e, byId, b.stats);
    if (!p) valid++;
    else errors.push(`briefing/${date}: ${p}`);
  }

  if (prune) {
    for (const [name, value] of Object.entries(f)) writeFileSync(join(DIR, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
  }
  for (const w of warnings) console.log(`warn  ${w}`);
  for (const e of errors) console.log(`ERROR ${e}`);
  console.log(`summaries: ${valid} valid · ${warnings.length} warnings · ${errors.length} errors${prune ? " (pruned)" : ""}`);
  if (errors.length) process.exit(1);
}

const cmd = process.argv[2];
if (cmd === "pending") pending();
else if (cmd === "check") check();
else {
  console.error("Usage: tsx scripts/summaries.ts pending|check [--prune] [--limit=60] [--days=14] [--discover=25]");
  process.exit(1);
}
