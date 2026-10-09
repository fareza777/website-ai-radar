import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LABS } from "@/config/labs";
import type { Briefing, Deal, DiscoverItem, RunStatus, UpdateItem } from "./types";

/**
 * Server-only data access. Data lives in /data as JSON committed by the collector,
 * read synchronously at build/prerender time (pages are fully static).
 */

const DATA_DIR = join(process.cwd(), "data");
const cache = new Map<string, unknown>();

function load<T>(rel: string, fallback: T): T {
  if (cache.has(rel)) return cache.get(rel) as T;
  let value: T;
  try {
    value = JSON.parse(readFileSync(join(DATA_DIR, rel), "utf8")) as T;
  } catch {
    value = fallback;
  }
  cache.set(rel, value);
  return value;
}

export function getLabItems(slug: string): UpdateItem[] {
  return load<UpdateItem[]>(`updates/${slug}.json`, []);
}

export function getAllItems(): UpdateItem[] {
  const all = LABS.flatMap((l) => getLabItems(l.slug));
  return all.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getStatus(): RunStatus | null {
  return load<RunStatus | null>("status.json", null);
}

export function getDiscover(): DiscoverItem[] {
  return load<DiscoverItem[]>("discover.json", []);
}

export function getDeals(): Deal[] {
  return load<Deal[]>("deals.json", []);
}

export function getBriefings(): Briefing[] {
  return load<Briefing[]>("briefings.json", []);
}

/** Reference "now" for server-side windows = the collector's last run (never the wall clock). */
export function dataTime(): number {
  const s = getStatus();
  return s ? Date.parse(s.generatedAt) : 0;
}

/** Slim payload for client feed lists (drops fields the list never renders). */
export type FeedItem = Pick<
  UpdateItem,
  "id" | "lab" | "title" | "url" | "sourceName" | "trust" | "verified" | "publishedAt" | "updatedAt" | "summary" | "benefit" | "category" | "tags" | "importance" | "sourceType"
> & { seenIn?: number };

export function toFeedItem(i: UpdateItem): FeedItem {
  return {
    id: i.id, lab: i.lab, title: i.title, url: i.url, sourceName: i.sourceName, trust: i.trust, verified: i.verified,
    publishedAt: i.publishedAt, updatedAt: i.updatedAt, summary: i.summary, benefit: i.benefit, category: i.category,
    tags: i.tags, importance: i.importance, sourceType: i.sourceType,
    ...(i.seenIn?.length ? { seenIn: i.seenIn.length } : {}),
  };
}

export interface LabStat {
  slug: string;
  total: number;
  last7: number;
  last30: number;
  latestAt: string | null;
  /** Daily counts for the last 30 days (oldest → newest), for sparklines. */
  spark: number[];
}

export function getLabStats(): LabStat[] {
  const now = dataTime();
  return LABS.map((l) => {
    const items = getLabItems(l.slug);
    const spark = new Array<number>(30).fill(0);
    let last7 = 0;
    let last30 = 0;
    for (const i of items) {
      const age = (now - Date.parse(i.publishedAt)) / 86_400_000;
      if (age < 7) last7++;
      if (age < 30) {
        last30++;
        spark[29 - Math.max(0, Math.floor(age))]++;
      }
    }
    return { slug: l.slug, total: items.length, last7, last30, latestAt: items[0]?.publishedAt ?? null, spark };
  });
}
