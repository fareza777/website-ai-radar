import type { LabConfig, SourceConfig, UpdateItem } from "../../src/lib/types";
import { classify, extractTags, importance } from "./classify";
import type { RawItem } from "./sources";
import { templateSummary } from "./summarize";
import { isOfficialUrl, jaccard, normalizeUrl, shortHash, titleTokens } from "./text";

export function itemId(url: string): string {
  return shortHash(normalizeUrl(url));
}

function contentHash(raw: RawItem): string {
  return shortHash(`${raw.title}\n${raw.excerpt}`, 12);
}

/** Builds a normalized item from a raw source entry. */
export function buildItem(lab: LabConfig, source: SourceConfig, raw: RawItem, nowIso: string): UpdateItem {
  const url = normalizeUrl(raw.url);
  const category = classify(raw.title, raw.excerpt, source.type);
  const verified = isOfficialUrl(url, lab.domains);
  const { summary, benefit } = templateSummary({
    labName: lab.name, title: raw.title, excerpt: raw.excerpt, category,
    sourceType: source.type, sourceName: source.name, meta: raw.meta,
  });
  return {
    id: itemId(url),
    lab: lab.slug,
    title: raw.title,
    url,
    sourceId: source.id,
    sourceName: source.name,
    sourceType: source.type,
    trust: source.trust,
    verified,
    publishedAt: raw.publishedAt.toISOString(),
    firstSeenAt: nowIso,
    updatedAt: raw.publishedAt.toISOString(),
    excerpt: raw.excerpt,
    summary,
    benefit,
    summarySource: "template",
    category,
    tags: extractTags(raw.title, raw.excerpt),
    importance: importance({ lab: lab.slug, title: raw.title, category, sourceType: source.type, verified, meta: raw.meta }),
    contentHash: contentHash(raw),
    ...(raw.meta ? { meta: raw.meta } : {}),
  };
}

/**
 * Merges freshly fetched items into the existing history (immutable: returns a new array).
 * - New ids are appended.
 * - Known ids keep firstSeenAt; if content changed, fields refresh and updatedAt = now.
 * - Items absent from the current fetch are kept (history is never deleted by a failing source).
 */
export function mergeItems(existing: readonly UpdateItem[], incoming: readonly UpdateItem[], nowIso: string): UpdateItem[] {
  const byId = new Map(existing.map((i) => [i.id, i]));
  const absorbed = new Set(existing.flatMap((i) => (i.seenIn ?? []).map((s) => itemId(s.url))));

  for (const next of incoming) {
    if (absorbed.has(next.id)) continue; // already merged into another item by dedupe
    const prev = byId.get(next.id);
    if (!prev) {
      byId.set(next.id, next);
      continue;
    }
    // A Hugging Face model id is immutable, so it never counts as an edited post.
    const changed = prev.contentHash !== next.contentHash && next.sourceType !== "huggingface";
    const keepLlm = !changed && prev.summarySource === "llm";
    byId.set(next.id, {
      ...next,
      firstSeenAt: prev.firstSeenAt,
      publishedAt: prev.publishedAt,
      updatedAt: changed ? nowIso : prev.updatedAt,
      summary: keepLlm ? prev.summary : next.summary,
      benefit: keepLlm ? prev.benefit : next.benefit,
      summarySource: keepLlm ? "llm" : "template",
      category: keepLlm ? prev.category : next.category,
      importance: keepLlm ? prev.importance : next.importance,
      seenIn: prev.seenIn,
    });
  }
  return [...byId.values()];
}

/**
 * Re-applies the (deterministic) classifier and ranker to stored items so rule improvements
 * propagate to history. LLM-written summaries/categories are preserved.
 */
export function reclassify(lab: LabConfig, item: UpdateItem): UpdateItem {
  const verified = isOfficialUrl(item.url, lab.domains);
  if (item.sourceType === "huggingface" && item.updatedAt !== item.publishedAt) {
    item = { ...item, updatedAt: item.publishedAt };
  }
  if (item.summarySource === "llm") {
    return { ...item, verified, importance: importance({ ...item, verified }) };
  }
  const category = classify(item.title, item.excerpt, item.sourceType);
  const { summary, benefit } = templateSummary({
    labName: lab.name, title: item.title, excerpt: item.excerpt, category,
    sourceType: item.sourceType, sourceName: item.sourceName, meta: item.meta,
  });
  return {
    ...item,
    verified,
    category,
    summary,
    benefit,
    tags: extractTags(item.title, item.excerpt),
    importance: importance({ lab: lab.slug, title: item.title, category, sourceType: item.sourceType, verified, meta: item.meta }),
  };
}

const SOURCE_PRIORITY: Record<string, number> = { rss: 3, "github-releases": 2, "github-new-repos": 1, huggingface: 1 };

function priority(i: UpdateItem): number {
  return (SOURCE_PRIORITY[i.sourceType] ?? 0) * 2 + (i.trust === "official" ? 1 : 0);
}

const DEDUPE_WINDOW_MS = 3 * 86_400_000;
const DEDUPE_SIMILARITY = 0.72;

/**
 * Cross-source dedupe within one lab: same story reported by two sources (e.g. official blog and
 * a mirror, or blog + HF) within 3 days with near-identical titles collapses into one item.
 * The higher-priority source wins; the other is recorded in `seenIn`.
 */
export function dedupe(items: readonly UpdateItem[]): UpdateItem[] {
  const sorted = [...items].sort((a, b) => priority(b) - priority(a) || a.publishedAt.localeCompare(b.publishedAt));
  const kept: UpdateItem[] = [];
  const tokens = new Map<string, Set<string>>();
  const tok = (i: UpdateItem) => {
    let t = tokens.get(i.id);
    if (!t) tokens.set(i.id, (t = titleTokens(i.title)));
    return t;
  };

  for (const item of sorted) {
    const t = Date.parse(item.publishedAt);
    const dupIndex = kept.findIndex(
      (k) =>
        k.id !== item.id &&
        // Only collapse reports from DIFFERENT sources; two entries of one feed are distinct releases.
        k.sourceId !== item.sourceId &&
        !(k.sourceType === "github-releases" && item.sourceType === "github-releases") &&
        Math.abs(Date.parse(k.publishedAt) - t) <= DEDUPE_WINDOW_MS &&
        jaccard(tok(k), tok(item)) >= DEDUPE_SIMILARITY,
    );
    if (dupIndex === -1) {
      kept.push(item);
      continue;
    }
    const winner = kept[dupIndex];
    const seen = [...(winner.seenIn ?? [])];
    if (!seen.some((s) => s.url === item.url)) seen.push({ sourceId: item.sourceId, sourceName: item.sourceName, url: item.url });
    for (const s of item.seenIn ?? []) if (!seen.some((x) => x.url === s.url)) seen.push(s);
    kept[dupIndex] = { ...winner, seenIn: seen };
  }
  return kept.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
