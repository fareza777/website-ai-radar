/**
 * AI Radar collector — entrypoint.
 *
 *   npm run collect                       # full run (labs + discover + deals + briefing)
 *   npm run collect -- --only=labs        # labs | discover | deals
 *   npm run collect -- --lab=openai       # single lab (with --only=labs)
 *   npm run collect -- --backfill-days=90 # window for accepting items (default 90)
 *
 * Exit code is 0 even when individual sources fail (their last valid state is kept);
 * it is non-zero only for unexpected crashes, so CI surfaces real breakage.
 */
import { LABS } from "../src/config/labs";
import type { RunStatus, SourceStatus, UpdateItem } from "../src/lib/types";
import { buildBriefing, saveBriefing } from "./collector/briefing";
import { collectDeals, saveDeals } from "./collector/deals";
import { writeBackTips } from "./collector/buzz";
import { collectDiscover, saveDiscover } from "./collector/discover";
import { collectModels, saveModels } from "./collector/models";
import { collectStartups, saveStartups } from "./collector/startups";
import { siteUrl } from "../src/lib/site";
import { errorMessage } from "./collector/http";
import { collectLabs, loadLabItems, saveLabItems } from "./collector/labs";
import { enrichDiscover, enrichUpdates, llmConfig } from "./collector/llm";
import { dataPath, readJson, writeJson } from "./collector/store";
import { daysAgo } from "./collector/text";

const log = (m: string) => console.log(m);

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split("=").slice(1).join("=");
}

async function main() {
  const started = Date.now();
  const now = new Date();
  const only = arg("only");
  const labFilter = arg("lab");
  const backfillDays = Number(arg("backfill-days") ?? process.env.BACKFILL_DAYS ?? 90);
  if (!Number.isInteger(backfillDays) || backfillDays < 1 || backfillDays > 3650) {
    throw new Error(`Invalid --backfill-days: ${arg("backfill-days") ?? process.env.BACKFILL_DAYS}`);
  }
  if (only && !["labs", "discover", "deals", "models"].includes(only)) throw new Error(`Invalid --only: ${only} (labs | discover | deals | models)`);
  if (labFilter && !LABS.some((l) => l.slug === labFilter)) throw new Error(`Unknown --lab: ${labFilter}`);
  const llm = llmConfig();
  const prev = readJson<RunStatus | null>(dataPath("status.json"), null);
  const prevStatus = new Map((prev?.sources ?? []).map((s) => [s.id, s]));
  const statuses = new Map<string, SourceStatus>(prevStatus);
  let summarized = 0;

  log(`AI Radar collect @ ${now.toISOString()} · window=${backfillDays}d · llm=${llm ? llm.model : "off"} · github token=${process.env.GITHUB_TOKEN || process.env.GH_TOKEN ? "yes" : "no"}`);

  // ---------- labs ----------
  let labItems = new Map<string, UpdateItem[]>(LABS.map((l) => [l.slug, loadLabItems(l.slug)]));
  if (!only || only === "labs") {
    const res = await collectLabs({ now, since: daysAgo(now, backfillDays) }, prevStatus, log, labFilter);
    labItems = res.items;
    for (const s of res.statuses) statuses.set(s.id, s);

    if (llm && llm.maxItems > 0) {
      const pending = [...labItems.values()]
        .flat()
        .filter((i) => i.summarySource === "template" && Date.parse(i.publishedAt) >= daysAgo(now, 14).getTime())
        .sort((a, b) => b.importance - a.importance)
        .slice(0, llm.maxItems);
      if (pending.length) {
        log(`[llm] summarizing ${pending.length} items with ${llm.model}`);
        const out = await enrichUpdates(
          llm,
          pending.map((i) => ({ id: i.id, lab: i.lab, title: i.title, excerpt: i.excerpt, source: i.sourceName })),
          log,
        );
        summarized = out.size;
        for (const [slug, list] of labItems) {
          labItems.set(
            slug,
            list.map((i) => {
              const e = out.get(i.id);
              return e ? { ...i, summary: e.summary, benefit: e.benefit, category: e.category ?? i.category, summarySource: "llm" as const } : i;
            }),
          );
        }
      }
    }
    log(`[labs] files changed: ${saveLabItems(labItems)}`);
  }

  const allItems = [...labItems.values()].flat();

  // ---------- discover ----------
  if (!only || only === "discover") {
    try {
      const res = await collectDiscover(now, log);
      let items = res.items;
      if (llm && llm.maxItems > 0) {
        const pending = items.filter((i) => i.summarySource === "template" && i.description).slice(0, 24);
        if (pending.length) {
          const out = await enrichDiscover(
            llm,
            pending.map((i) => ({ id: i.id, name: i.name, description: i.description, topics: i.topics ?? [], url: i.url })),
            log,
          );
          summarized += out.size;
          items = items.map((i) => {
            const e = out.get(i.id);
            return e ? { ...i, ...e, summarySource: "llm" as const } : i;
          });
        }
      }
      for (const s of res.statuses) statuses.set(s.id, s);
      log(`[discover] items=${items.length} changed=${saveDiscover(items)}`);
      await writeBackTips(res.tipOutcomes, res.issues, siteUrl(), log);
    } catch (err) {
      log(`[discover] FAILED (previous data kept): ${errorMessage(err)}`);
    }
    try {
      const res = await collectStartups(now, log);
      for (const s of res.statuses) statuses.set(s.id, s);
      log(`[startups] items=${res.items.length} changed=${saveStartups(res.items)}`);
    } catch (err) {
      log(`[startups] FAILED (previous data kept): ${errorMessage(err)}`);
    }
  }

  // ---------- models & price tracker ----------
  if (!only || only === "models" || only === "deals") {
    const res = await collectModels(now, log);
    statuses.set(res.status.id, res.status);
    log(`[models] models=${res.models.length} moves=${res.moves.length} changed=${saveModels(res.models, res.moves)}`);
  }

  // ---------- deals ----------
  if (!only || only === "deals") {
    try {
      const res = await collectDeals(now, allItems, log);
      for (const s of res.statuses) statuses.set(s.id, s);
      log(`[deals] deals=${res.deals.length} changed=${saveDeals(res.deals)}`);
    } catch (err) {
      log(`[deals] FAILED (previous data kept): ${errorMessage(err)}`);
    }
  }

  // ---------- briefing ----------
  if (!only || only === "labs") {
    const briefing = await buildBriefing(allItems, now, llm, log);
    log(`[briefing] ${briefing.date} (${briefing.source}) changed=${saveBriefing(briefing)}`);
  }

  const knownIds = new Set([...LABS.flatMap((l) => l.sources.map((s) => s.id)), ...[...statuses.values()].filter((s) => s.lab === "discover" || s.lab === "deals" || s.lab === "models").map((s) => s.id)]);
  const status: RunStatus = {
    generatedAt: now.toISOString(),
    durationMs: Date.now() - started,
    llm: { enabled: !!llm, model: llm?.model ?? null, summarized },
    sources: [...statuses.values()].filter((s) => knownIds.has(s.id)).sort((a, b) => a.lab.localeCompare(b.lab) || a.id.localeCompare(b.id)),
  };
  writeJson(dataPath("status.json"), status);
  const failed = status.sources.filter((s) => !s.ok && !s.skipped).length;
  const skipped = status.sources.filter((s) => s.skipped).length;
  log(`Done in ${(status.durationMs / 1000).toFixed(1)}s · sources ok=${status.sources.length - failed - skipped} failed=${failed} skipped=${skipped} · items=${allItems.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
