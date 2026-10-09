import { LABS } from "../../src/config/labs";
import type { LabConfig, SourceStatus, UpdateItem } from "../../src/lib/types";
import { errorMessage, pool } from "./http";
import { buildItem, dedupe, mergeItems, reclassify } from "./merge";
import { fetchSource, type FetchContext } from "./sources";
import { dataPath, readJson, writeJson } from "./store";

/** Max items kept per lab file — older history stays in git. */
const MAX_ITEMS_PER_LAB = 600;

export interface LabRunResult {
  items: Map<string, UpdateItem[]>;
  statuses: SourceStatus[];
}

export function labFile(slug: string): string {
  return dataPath("updates", `${slug}.json`);
}

export function loadLabItems(slug: string): UpdateItem[] {
  return readJson<UpdateItem[]>(labFile(slug), []);
}

/** When a lab has nothing inside the window, show its latest real releases from up to a year back. */
const ARCHIVE_DAYS = 365;
const ARCHIVE_LIMIT = 5;

async function runLab(lab: LabConfig, ctx: FetchContext, prevStatus: Map<string, SourceStatus>, log: (m: string) => void) {
  const nowIso = ctx.now.toISOString();
  const statuses: SourceStatus[] = [];
  const incoming: UpdateItem[] = [];
  const sourceIds = new Set(lab.sources.map((s) => s.id));
  // Items from sources removed from the registry are dropped (e.g. a repo that changed owner).
  const existing = loadLabItems(lab.slug).filter((i) => sourceIds.has(i.sourceId));
  const needsArchive = existing.length === 0;
  const archiveCtx: FetchContext = { ...ctx, since: new Date(ctx.now.getTime() - ARCHIVE_DAYS * 86_400_000) };

  await pool(lab.sources, 3, async (source) => {
    const prev = prevStatus.get(source.id);
    const base = { id: source.id, lab: lab.slug, name: source.name, type: source.type, target: source.target, lastRunAt: nowIso };
    try {
      let res = await fetchSource(source, ctx);
      if (needsArchive && res.items.length === 0) {
        const archive = await fetchSource({ ...source, limit: ARCHIVE_LIMIT }, archiveCtx);
        res = { ...archive, items: archive.items.slice(0, ARCHIVE_LIMIT) };
      }
      incoming.push(...res.items.map((raw) => buildItem(lab, source, raw, nowIso)));
      statuses.push({ ...base, ok: true, lastSuccessAt: nowIso, lastError: null, fetched: res.fetched, accepted: res.items.length });
      log(`  ✓ ${source.id.padEnd(26)} fetched=${res.fetched} accepted=${res.items.length}`);
    } catch (err) {
      // Keep the last valid state: existing items are untouched, status records the failure.
      statuses.push({ ...base, ok: false, lastSuccessAt: prev?.lastSuccessAt ?? null, lastError: errorMessage(err), fetched: 0, accepted: 0 });
      log(`  ✗ ${source.id.padEnd(26)} ${errorMessage(err)}`);
    }
  });

  const merged = dedupe(mergeItems(existing, incoming, nowIso).map((i) => reclassify(lab, i))).slice(0, MAX_ITEMS_PER_LAB);
  return { merged, statuses };
}

export async function collectLabs(
  ctx: FetchContext,
  prevStatus: Map<string, SourceStatus>,
  log: (m: string) => void,
  only?: string,
): Promise<LabRunResult> {
  const items = new Map<string, UpdateItem[]>();
  const statuses: SourceStatus[] = [];
  const labs = only ? LABS.filter((l) => l.slug === only) : LABS;

  for (const lab of LABS) if (!labs.includes(lab)) items.set(lab.slug, loadLabItems(lab.slug));

  await pool(labs, 4, async (lab) => {
    const res = await runLab(lab, ctx, prevStatus, (m) => log(`[${lab.slug}] ${m.trim()}`));
    items.set(lab.slug, res.merged);
    statuses.push(...res.statuses);
  });
  return { items, statuses };
}

export function saveLabItems(items: Map<string, UpdateItem[]>): number {
  let changed = 0;
  for (const [slug, list] of items) if (writeJson(labFile(slug), list)) changed++;
  return changed;
}
