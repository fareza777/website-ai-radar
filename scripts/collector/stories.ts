import { LAB_ALIASES } from "../../src/config/signals";
import type { PressItem, StoriesFile, StoryCluster, TrendingEntry, Unconfirmed, UpdateItem } from "../../src/lib/types";
import { jaccard, titleTokens } from "./text";

// ───────────────────────── entity extraction ─────────────────────────

const FAMILIES =
  "gpt|claude|gemini|gemma|grok|llama|qwen|qwq|kimi|glm|deepseek|mistral|mixtral|magistral|devstral|codestral|minimax|nova|nemotron|granite|phi|ernie|hunyuan|doubao|jamba|sora|veo|imagen|opus|sonnet|haiku|embed";
const PREFIX_WORDS = new Set([
  "large", "medium", "small", "mini", "pro", "ultra", "flash", "lite", "nano", "micro", "plus", "max", "turbo", "coder", "instruct",
  "vl", "omni", "thinking", "code", "image", "video", "live", "sonic", "haiku", "sonnet", "opus", "reasoner", "chat",
]);
const VARIANT_STOP = new Set([
  "is", "are", "and", "or", "on", "in", "to", "for", "with", "the", "a", "an", "of", "at", "by", "vs", "now", "family", "models", "model",
  "api", "launches", "launch", "gets", "adds", "brings", "arrives", "available", "update", "updates", "release", "released", "expands",
  "ships", "debuts", "unveils", "rolls", "goes", "comes", "has", "will", "can", "as", "from", "new", "beats", "tops", "hits", "powers",
]);
const CLAUDE_TIERS = new Set(["opus", "sonnet", "haiku"]);

const ENTITY_RE = new RegExp(
  `(?<![A-Za-z0-9])(${FAMILIES})(?![A-Za-z])[-\\s]?(?:([A-Za-z]{2,10})[-\\s])?[vV]?(\\d+(?:\\.\\d+)*)(?:[-\\s]?([A-Za-z0-9]{2,10}))?`,
  "gi",
);

export interface Entity {
  /** Canonical, lower-case, space separated, e.g. "claude haiku 5.5". */
  key: string;
  /** Display form, e.g. "Claude Haiku 5.5". */
  label: string;
}

const LABELS: Record<string, string> = { gpt: "GPT", glm: "GLM", deepseek: "DeepSeek", minimax: "MiniMax", ernie: "ERNIE", qwq: "QwQ", vl: "VL", xai: "xAI" };
const cap = (s: string) => {
  if (LABELS[s]) return LABELS[s];
  if (/^d+[bm]$/.test(s)) return s.toUpperCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Extracts model/product entities such as "Claude Haiku 5.5" or "GPT-6.1 Sol" from a headline. */
export function extractEntities(title: string): Entity[] {
  const out = new Map<string, Entity>();
  for (const m of title.matchAll(ENTITY_RE)) {
    let family = m[1].toLowerCase();
    const maybePrefix = m[2]?.toLowerCase();
    const prefix = maybePrefix && PREFIX_WORDS.has(maybePrefix) ? maybePrefix : undefined;
    const version = m[3];
    const rawVariant = m[4];
    // The prefix group may have actually been a variant-less word that is not part of the name — only keep allow-listed ones.
    let variant: string | undefined;
    if (rawVariant && /^[A-Z]/.test(rawVariant) && !VARIANT_STOP.has(rawVariant.toLowerCase()) && !/^\d/.test(rawVariant)) variant = rawVariant.toLowerCase();
    else if (rawVariant && /^\d+[bBmM]$/.test(rawVariant)) variant = rawVariant.toLowerCase();
    if (family === "embed" && !prefix && version.split(".").length === 1 && Number(version) > 9) continue;
    if (CLAUDE_TIERS.has(family)) {
      const tier = family;
      family = "claude";
      const tokens = ["claude", tier, version, ...(variant ? [variant] : [])];
      out.set(tokens.join(" "), { key: tokens.join(" "), label: tokens.map(cap).join(" ") });
      continue;
    }
    const tokens = [family, ...(prefix ? [prefix] : []), version, ...(variant ? [variant] : [])];
    const key = tokens.join(" ");
    out.set(key, { key, label: tokens.map(cap).join(" ") });
  }
  return [...out.values()];
}

/** Two entities are linked when one's tokens are a prefix of the other's ("gpt 6.1" ⊂ "gpt 6.1 sol"). */
export function entitiesLink(a: string, b: string): boolean {
  const x = a.split(" ");
  const y = b.split(" ");
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.every((t, i) => long[i] === t);
}

// ───────────────────────── press helpers ─────────────────────────

/** "Headline - Outlet" → { title, outlet }. */
export function splitHeadline(raw: string, source?: string): { title: string; outlet: string } {
  const t = raw.replace(/\s+/g, " ").trim();
  if (source && t.endsWith(` - ${source}`)) return { title: t.slice(0, -(source.length + 3)).trim(), outlet: source };
  const m = /^(.*\S)\s+[-–—|]\s+([^-–—|]{2,40})$/.exec(t);
  if (m) return { title: m[1].trim(), outlet: source || m[2].trim() };
  return { title: t, outlet: source || "Unknown outlet" };
}

const DAY = 86_400_000;

/** Distinctive tokens: title tokens minus lab-name words and generic news words. */
const GENERIC = new Set(["ai", "new", "says", "report", "reports", "reportedly", "launch", "launches", "launched", "announces", "announced", "unveils", "release", "releases", "released", "model", "models", "update", "news", "today", "now", "its", "after", "about", "more", "this", "that", "will", "year"]);
export function distinctiveTokens(title: string, lab?: string): Set<string> {
  const aliasWords = new Set((lab ? LAB_ALIASES[lab] ?? [] : []).flatMap((a) => a.split(/[\s.]+/)));
  return new Set([...titleTokens(title)].filter((t) => t.length > 2 && !GENERIC.has(t) && !aliasWords.has(t)));
}

export interface PressRaw {
  lab: string;
  title: string;
  url: string;
  outlet: string;
  at: Date;
}

/**
 * Merges a raw press report into the archive: same lab + near-identical headline within a few days
 * becomes one cluster whose `reports` counts distinct outlets.
 */
export function mergePress(archive: readonly PressItem[], raw: PressRaw, idOf: (url: string) => string, nowIso: string, similarity: number, days: number): PressItem[] {
  const member = idOf(raw.url);
  const tokens = titleTokens(raw.title);
  const at = raw.at.toISOString();
  const idx = archive.findIndex(
    (p) =>
      p.lab === raw.lab &&
      (p.members.includes(member) ||
        (Math.abs(Date.parse(p.publishedAt) - raw.at.getTime()) <= days * DAY && jaccard(titleTokens(p.title), tokens) >= similarity)),
  );
  if (idx === -1) {
    return [
      ...archive,
      { id: member, lab: raw.lab, title: raw.title, url: raw.url, outlet: raw.outlet, publishedAt: at, firstSeenAt: nowIso, reports: 1, outlets: [raw.outlet], members: [member] },
    ];
  }
  const p = archive[idx];
  if (p.members.includes(member)) return [...archive];
  const outlets = p.outlets.includes(raw.outlet) ? p.outlets : [...p.outlets, raw.outlet];
  const earlier = raw.at.getTime() < Date.parse(p.publishedAt);
  const merged: PressItem = {
    ...p,
    ...(earlier ? { title: raw.title, url: raw.url, outlet: raw.outlet, publishedAt: at } : {}),
    outlets,
    reports: outlets.length,
    members: [...p.members, member].slice(-40),
  };
  return archive.map((x, i) => (i === idx ? merged : x));
}

// ───────────────────────── story clustering ─────────────────────────

interface Node {
  kind: "official" | "press";
  id: string;
  lab: string;
  title: string;
  url: string;
  at: number;
  importance: number;
  outlets: string[];
  entities: Entity[];
  tokens: Set<string>;
}

const GAP_DAYS = 5;
const TOKEN_LINK = 0.6;
const MIN_TOKENS = 4;
/** Headlines comparing several products must not bridge unrelated stories. */
const COMPARE_RE = /(\bvs\.?\b|\bversus\b|\bbeats?\b|\brivals?\b|\btakes? on\b|\bchallenges?\b|\bcompet(e|es|ing)\b|\boutperforms?\b|better than|compared (to|with)|alternative to)/i;

function toNodes(official: readonly UpdateItem[], press: readonly PressItem[], now: number, windowDays: number): Node[] {
  const since = now - windowDays * DAY;
  const nodes: Node[] = [];
  const entitiesOf = (title: string) => (COMPARE_RE.test(title) ? [] : extractEntities(title).slice(0, 1));
  for (const i of official) {
    const at = Date.parse(i.publishedAt);
    if (at < since) continue;
    // GitHub releases and HF model rows are not "stories" on their own.
    if (i.sourceType !== "rss") continue;
    nodes.push({ kind: "official", id: i.id, lab: i.lab, title: i.title, url: i.url, at, importance: i.importance, outlets: [], entities: entitiesOf(i.title), tokens: distinctiveTokens(i.title) });
  }
  for (const p of press) {
    const at = Date.parse(p.publishedAt);
    if (at < since) continue;
    nodes.push({ kind: "press", id: p.id, lab: p.lab, title: p.title, url: p.url, at, importance: 35 + Math.min(30, p.reports * 5), outlets: p.outlets, entities: entitiesOf(p.title), tokens: distinctiveTokens(p.title) });
  }
  return nodes;
}

/**
 * Groups nodes into stories WITHOUT transitive chaining:
 *  1. nodes with a primary entity group by that exact entity (a shorter entity folds into a longer one only when exactly one
 *     longer variant exists, e.g. "gpt 6.1" → "gpt 6.1 sol");
 *  2. each group is split where the time gap exceeds GAP_DAYS;
 *  3. entity-less nodes cluster only with each other, by strong title similarity.
 */
function groupNodes(nodes: Node[]): Node[][] {
  const withEntity = nodes.filter((n) => n.entities.length > 0);
  const keys = [...new Set(withEntity.map((n) => n.entities[0].key))];
  const fold = new Map<string, string>();
  for (const k of keys) {
    const longer = keys.filter((o) => o !== k && o.split(" ").length > k.split(" ").length && entitiesLink(k, o));
    fold.set(k, longer.length === 1 ? longer[0] : k);
  }
  const byKey = new Map<string, Node[]>();
  for (const n of withEntity) {
    const k = fold.get(n.entities[0].key)!;
    byKey.set(k, [...(byKey.get(k) ?? []), n]);
  }
  const groups: Node[][] = [];
  for (const members of byKey.values()) {
    const sorted = [...members].sort((a, b) => a.at - b.at);
    let cur: Node[] = [];
    for (const n of sorted) {
      if (cur.length && n.at - cur[cur.length - 1].at > GAP_DAYS * DAY) {
        groups.push(cur);
        cur = [];
      }
      cur.push(n);
    }
    if (cur.length) groups.push(cur);
  }

  const rest = nodes.filter((n) => n.entities.length === 0 && n.tokens.size >= MIN_TOKENS);
  const parent = rest.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < rest.length; i++) {
    for (let j = i + 1; j < rest.length; j++) {
      if (Math.abs(rest[i].at - rest[j].at) <= GAP_DAYS * DAY && jaccard(rest[i].tokens, rest[j].tokens) >= TOKEN_LINK) parent[find(i)] = find(j);
    }
  }
  const loose = new Map<number, Node[]>();
  rest.forEach((n, i) => loose.set(find(i), [...(loose.get(find(i)) ?? []), n]));
  groups.push(...loose.values());
  return groups;
}

export function clusterStories(official: readonly UpdateItem[], press: readonly PressItem[], now: number, limit = 40): StoryCluster[] {
  const nodes = toNodes(official, press, now, 10);
  const stories: StoryCluster[] = [];
  for (const members of groupNodes(nodes)) {
    const labs = [...new Set(members.map((m) => m.lab))];
    const outlets = [...new Set(members.flatMap((m) => m.outlets))];
    const officials = members.filter((m) => m.kind === "official");
    const sources = labs.length + outlets.length;
    // A story needs real breadth: several labs, or an official post plus independent coverage.
    const qualifies = labs.length >= 2 || (officials.length >= 1 && outlets.length >= 2) || outlets.length >= 4;
    if (!qualifies || members.length < 2) continue;

    const lead = [...officials].sort((x, y) => y.importance - x.importance)[0] ?? [...members].sort((x, y) => y.outlets.length - x.outlets.length)[0];
    const entityCounts = new Map<string, { label: string; n: number }>();
    for (const m of members) for (const e of m.entities) entityCounts.set(e.key, { label: e.label, n: (entityCounts.get(e.key)?.n ?? 0) + 1 });
    const top = [...entityCounts.values()].sort((x, y) => y.n - x.n || y.label.length - x.label.length)[0];
    const times = members.map((m) => m.at);
    stories.push({
      id: lead.id,
      title: lead.title,
      entity: top?.label ?? null,
      labs,
      official: officials.length,
      press: members.length - officials.length,
      outlets,
      firstAt: new Date(Math.min(...times)).toISOString(),
      lastAt: new Date(Math.max(...times)).toISOString(),
      url: lead.url,
      lead: { kind: lead.kind, id: lead.id },
      importance: Math.min(100, Math.round((officials.length ? Math.max(...officials.map((o) => o.importance)) : 40) + Math.log2(sources + 1) * 6)),
    });
  }
  return stories.sort((x, y) => y.importance - x.importance || y.lastAt.localeCompare(x.lastAt)).slice(0, limit);
}

// ───────────────────────── trending ─────────────────────────

export function trendingEntities(official: readonly UpdateItem[], press: readonly PressItem[], now: number, limit = 14): TrendingEntry[] {
  const cur = new Map<string, TrendingEntry>();
  const bump = (e: Entity, lab: string, at: number) => {
    const age = now - at;
    if (age < 0 || age > 14 * DAY) return;
    const row = cur.get(e.key) ?? { name: e.label, count: 0, prev: 0, labs: [] };
    if (age <= 7 * DAY) row.count++;
    else row.prev++;
    if (!row.labs.includes(lab)) row.labs.push(lab);
    cur.set(e.key, row);
  };
  for (const i of official) for (const e of extractEntities(i.title)) bump(e, i.lab, Date.parse(i.publishedAt));
  for (const p of press) for (const e of extractEntities(p.title)) bump(e, p.lab, Date.parse(p.publishedAt));
  // Fold variants into their base entity ("gpt 6.1 sol" counts toward "gpt 6.1") only for display ordering.
  return [...cur.values()]
    .filter((r) => r.count >= 3)
    .sort((a, b) => b.count - a.count || b.count - b.prev - (a.count - a.prev))
    .slice(0, limit);
}

export function trendingTopics(official: readonly UpdateItem[], now: number, limit = 10): TrendingEntry[] {
  const rows = new Map<string, TrendingEntry>();
  for (const i of official) {
    const age = now - Date.parse(i.publishedAt);
    if (age < 0 || age > 14 * DAY) continue;
    for (const t of i.tags) {
      if (/^\d/.test(t)) continue; // model sizes are not topics
      const r = rows.get(t) ?? { name: t, count: 0, prev: 0, labs: [] };
      if (age <= 7 * DAY) r.count++;
      else r.prev++;
      if (!r.labs.includes(i.lab)) r.labs.push(i.lab);
      rows.set(t, r);
    }
  }
  return [...rows.values()].filter((r) => r.count >= 2).sort((a, b) => b.count - a.count).slice(0, limit);
}

// ───────────────────────── unconfirmed reports ─────────────────────────

const RELEASE_RE = /\b(launch(es|ed)?|releases?|released|unveils?|unveiled|introduces?|announces?|announced|debuts?|rolls? out|rolling out|open[- ]sources?|acquires?|acquisition|raises?|partners?|partnership|ships?|expands?|cuts? prices?|price cut|now available|goes live)\b/i;
const EXPLAINER_RE = /(^(what|why|how|should|is|are|can|does)\b|\?\s*$|explained|guide|review|vs\.?\b|opinion|analysis|podcast|interview|here'?s why|what to know)/i;

/** Media reports of a release/announcement that no official feed has confirmed (yet). */
export function findUnconfirmed(official: readonly UpdateItem[], press: readonly PressItem[], now: number, limit = 12): Unconfirmed[] {
  const byLab = new Map<string, { at: number; entities: Entity[]; tokens: Set<string> }[]>();
  for (const i of official) {
    const row = { at: Date.parse(i.publishedAt), entities: extractEntities(i.title), tokens: distinctiveTokens(i.title, i.lab) };
    byLab.set(i.lab, [...(byLab.get(i.lab) ?? []), row]);
  }
  const out: Unconfirmed[] = [];
  for (const p of press) {
    const at = Date.parse(p.publishedAt);
    if (now - at > 3 * DAY || at > now + 6 * 3_600_000) continue;
    if (p.outlets.length < 2 || !RELEASE_RE.test(p.title) || EXPLAINER_RE.test(p.title)) continue;
    const entities = extractEntities(p.title);
    const tokens = distinctiveTokens(p.title, p.lab);
    const confirmed = (byLab.get(p.lab) ?? []).some((o) => {
      if (Math.abs(o.at - at) > 4 * DAY) return false;
      if (entities.some((x) => o.entities.some((y) => entitiesLink(x.key, y.key)))) return true;
      const inter = [...tokens].filter((t) => o.tokens.has(t)).length;
      return inter >= 2 || (tokens.size > 0 && inter / tokens.size >= 0.4);
    });
    if (confirmed) continue;
    out.push({ id: p.id, lab: p.lab, title: p.title, url: p.url, outlets: p.outlets, reports: p.reports, at: p.publishedAt });
  }
  return out.sort((a, b) => b.reports - a.reports || b.at.localeCompare(a.at)).slice(0, limit);
}

export function buildStories(official: readonly UpdateItem[], press: readonly PressItem[], now: Date): StoriesFile {
  const t = now.getTime();
  return {
    generatedAt: now.toISOString(),
    stories: clusterStories(official, press, t),
    trending: { entities: trendingEntities(official, press, t), topics: trendingTopics(official, t) },
    unconfirmed: findUnconfirmed(official, press, t),
  };
}
