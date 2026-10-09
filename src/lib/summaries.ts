import { isGrounded } from "./grounding";
import { CATEGORIES, type Briefing, type Category, type DiscoverItem, type UpdateItem } from "./types";

/**
 * Editorial summaries written by an agent (e.g. a scheduled Cursor run) into /summaries/*.json.
 * They are never trusted blindly: every entry is validated against the live item before it is shown.
 */

export interface UpdateSummaryEntry {
  /** contentHash of the item when summarized — a changed source makes the summary stale. */
  hash: string;
  summary: string;
  benefit: string;
  category?: Category;
}

export interface DiscoverSummaryEntry {
  summary: string;
  unique: string;
  benefit: string;
}

export interface BriefingSummaryEntry {
  headline: string;
  bullets: { text: string; itemId: string }[];
}

export interface SummaryFiles {
  updates: Record<string, UpdateSummaryEntry>;
  discover: Record<string, DiscoverSummaryEntry>;
  briefing: Record<string, BriefingSummaryEntry>;
}

const LIMITS = { summary: [20, 320], benefit: [15, 240], unique: [10, 200], headline: [20, 220], bullet: [15, 240] } as const;

function textOk(v: unknown, [min, max]: readonly [number, number]): v is string {
  return typeof v === "string" && v.trim().length >= min && v.trim().length <= max && !/https?:\/\//i.test(v);
}

/** Returns the reason an update summary is rejected, or null when it is valid for this item. */
export function updateSummaryProblem(e: UpdateSummaryEntry, item: UpdateItem | undefined): string | null {
  if (!item) return "unknown item id";
  if (e.hash !== item.contentHash) return "stale (source content changed since it was summarized)";
  if (!textOk(e.summary, LIMITS.summary)) return `summary must be ${LIMITS.summary[0]}–${LIMITS.summary[1]} chars, no URLs`;
  if (!textOk(e.benefit, LIMITS.benefit)) return `benefit must be ${LIMITS.benefit[0]}–${LIMITS.benefit[1]} chars, no URLs`;
  if (e.category !== undefined && !CATEGORIES.includes(e.category)) return `category must be one of ${CATEGORIES.join(", ")}`;
  const source = `${item.title} ${item.excerpt} ${Object.values(item.meta ?? {}).join(" ")}`;
  if (!isGrounded(`${e.summary} ${e.benefit}`, source)) return "contains numbers/prices not found in the source text";
  return null;
}

export function discoverSummaryProblem(e: DiscoverSummaryEntry, item: DiscoverItem | undefined): string | null {
  if (!item) return "unknown discover id";
  if (!textOk(e.summary, LIMITS.summary)) return "summary length/URL rule";
  if (!textOk(e.unique, LIMITS.unique)) return "unique length/URL rule";
  if (!textOk(e.benefit, LIMITS.benefit)) return "benefit length/URL rule";
  const source = `${item.name} ${item.description} ${(item.topics ?? []).join(" ")} ${item.quote?.text ?? ""} ${item.stars ?? ""}`;
  if (!isGrounded(`${e.summary} ${e.unique} ${e.benefit}`, source)) return "contains numbers not found in the source text";
  return null;
}

export function briefingSummaryProblem(e: BriefingSummaryEntry, byId: Map<string, UpdateItem>, stats: Briefing["stats"]): string | null {
  if (!textOk(e.headline, LIMITS.headline)) return "headline length/URL rule";
  if (!Array.isArray(e.bullets) || e.bullets.length < 3 || e.bullets.length > 6) return "needs 3–6 bullets";
  const statText = Object.values(stats).join(" ");
  const refs: string[] = [];
  for (const b of e.bullets) {
    const item = byId.get(b.itemId);
    if (!item) return `bullet references unknown itemId ${b.itemId}`;
    if (!textOk(b.text, LIMITS.bullet)) return "bullet length/URL rule";
    if (!isGrounded(b.text, `${item.title} ${item.excerpt} ${item.summary}`)) return `bullet for ${b.itemId} has numbers not in its source`;
    refs.push(`${item.title} ${item.excerpt}`);
  }
  if (!isGrounded(e.headline, `${refs.join(" ")} ${statText}`)) return "headline has numbers not in the referenced items/stats";
  return null;
}

/** Applies valid editorial summaries; invalid or stale ones are ignored (template/LLM text stays). */
export function overlayUpdates(items: UpdateItem[], entries: Record<string, UpdateSummaryEntry>): UpdateItem[] {
  return items.map((i) => {
    const e = entries[i.id];
    if (!e || updateSummaryProblem(e, i)) return i;
    return { ...i, summary: e.summary.trim(), benefit: e.benefit.trim(), category: e.category ?? i.category, summarySource: "llm" as const };
  });
}

export function overlayDiscover(items: DiscoverItem[], entries: Record<string, DiscoverSummaryEntry>): DiscoverItem[] {
  return items.map((i) => {
    const e = entries[i.id];
    if (!e || discoverSummaryProblem(e, i)) return i;
    return { ...i, summary: e.summary.trim(), unique: e.unique.trim(), benefit: e.benefit.trim(), summarySource: "llm" as const };
  });
}

export function overlayBriefings(list: Briefing[], entries: Record<string, BriefingSummaryEntry>, byId: Map<string, UpdateItem>): Briefing[] {
  return list.map((b) => {
    const e = entries[b.date];
    if (!e || briefingSummaryProblem(e, byId, b.stats)) return b;
    return {
      ...b,
      source: "llm" as const,
      headline: e.headline.trim(),
      bullets: e.bullets.map((x) => ({ text: x.text.trim(), itemId: x.itemId, lab: byId.get(x.itemId)?.lab })),
    };
  });
}
