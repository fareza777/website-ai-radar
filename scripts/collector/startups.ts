import { BUZZ } from "../../src/config/buzz";
import type { SourceStatus, StartupEventKind, StartupNews } from "../../src/lib/types";
import { parseFeed } from "./feed";
import { errorMessage, fetchText } from "./http";
import { dataPath, readJson, writeJson } from "./store";
import { daysAgo, jaccard, safeHttpUrl, shortHash, titleTokens } from "./text";

const AI_WORDS = /(\bai\b|a\.i\.|artificial intelligence|\bllm|agent|machine learning|genai|generative|chatbot|copilot|inference|model)/i;

/** Classifies a headline. Only words in the headline are used — nothing is inferred. */
export function startupKind(title: string): StartupEventKind {
  if (/\b(acquires?|acquired|acquisition|buys|bought|merges? with)\b/i.test(title)) return "acquisition";
  if (/\b(raises?|raised|funding|seed round|series [a-f]\b|valuation|valued at|backed by|secures \$|lands \$|nabs \$|closes \$)/i.test(title)) return "funding";
  if (/\b(launch(es|ed)?|unveils?|debuts?|introduces?|releases?|rolls out|opens)\b/i.test(title)) return "launch";
  return "other";
}

/** Money amount exactly as written in the headline (e.g. "$2.4M", "$500 million"). */
export function headlineAmount(title: string): string | null {
  return /(?:US)?\$\s?\d+(?:[.,]\d+)?\s?(?:k|m|mn|b|bn|million|billion)?\b/i.exec(title)?.[0]?.replace(/\s+/g, " ") ?? null;
}

const LEADING_NOISE = /^(exclusive|breaking|report|scoop|update)\s*[:—-]\s*/i;
const DESCRIPTORS = /^((?:[\w.'’-]+\s){0,5}?(?:startup|company|firm|unicorn|platform)\s+)/i;
const VERB_WORDS = /\b(raises?|raised|launch(?:es|ed)?|unveils?|debuts?|introduces?|acquires?|secures|lands|nabs|closes|opens|releases?|gets)\b/gi;

/** Company name from "<Company> raises/launches …" headlines; null when the pattern is absent. */
export function headlineCompany(title: string): string | null {
  // Lower-case Title Case verbs ("Raises") so the capitalized-name check below still works.
  const t = title
    .replace(LEADING_NOISE, "")
    .replace(DESCRIPTORS, "")
    .replace(VERB_WORDS, (v) => v.toLowerCase());
  const m = /^([A-Z0-9][\w.&'’-]*(?:\s+[A-Z0-9][\w.&'’-]*){0,3})(?:,[^,]{0,60},)?\s+(?:raises?|raised|launch(?:es|ed)?|unveils?|debuts?|introduces?|acquires?|secures|lands|nabs|closes|opens|releases?|rolls out|is acquired|gets)\b/.exec(t);
  return m ? m[1].replace(/[’']s$/, "") : null;
}

export async function collectStartups(now: Date, log: (m: string) => void): Promise<{ items: StartupNews[]; statuses: SourceStatus[] }> {
  const nowIso = now.toISOString();
  const file = dataPath("startups.json");
  const prev = readJson<StartupNews[]>(file, []);
  const prevStatus = readJson<{ sources?: SourceStatus[] }>(dataPath("status.json"), {}).sources ?? [];
  const statuses: SourceStatus[] = [];
  const fresh: StartupNews[] = [];
  const since = daysAgo(now, BUZZ.startupNewsKeepDays).getTime();

  for (const feed of BUZZ.startupNews) {
    const base = { id: `startups-${feed.id}`, lab: "discover", name: `Startup news · ${feed.name}`, type: "discover" as const, target: feed.url, lastRunAt: nowIso };
    try {
      const entries = parseFeed(await fetchText(feed.url));
      let n = 0;
      for (const e of entries) {
        const at = e.publishedAt ?? e.updatedAt;
        const url = safeHttpUrl(e.url);
        if (!at || !url || at.getTime() < since || at.getTime() > now.getTime() + 6 * 3_600_000) continue;
        // Google News appends " - Outlet" to titles.
        const outlet = feed.id.startsWith("gnews") ? / - ([^-]+)$/.exec(e.title)?.[1]?.trim() : undefined;
        const title = outlet ? e.title.replace(/ - [^-]+$/, "").trim() : e.title;
        const kind = startupKind(title);
        if (kind === "other" || !AI_WORDS.test(`${title} ${feed.id === "techcrunch-ai" ? "ai" : ""}`)) continue;
        fresh.push({
          id: shortHash(url),
          title,
          company: headlineCompany(title),
          kind,
          amount: kind === "funding" || kind === "acquisition" ? headlineAmount(title) : null,
          url,
          source: outlet ?? feed.name,
          publishedAt: at.toISOString(),
          firstSeenAt: nowIso,
        });
        n++;
      }
      statuses.push({ ...base, ok: true, lastSuccessAt: nowIso, lastError: null, fetched: entries.length, accepted: n });
      log(`[startups] ✓ ${feed.id} ${n}`);
    } catch (err) {
      const old = prevStatus.find((s) => s.id === base.id);
      statuses.push({ ...base, ok: false, lastSuccessAt: old?.lastSuccessAt ?? null, lastError: errorMessage(err), fetched: 0, accepted: 0 });
      log(`[startups] ✗ ${feed.id} ${errorMessage(err)}`);
    }
  }

  // Merge with history (keeps items from failed feeds), then collapse the same story across outlets.
  const byId = new Map(prev.map((p) => [p.id, p]));
  for (const f of fresh) byId.set(f.id, { ...f, firstSeenAt: byId.get(f.id)?.firstSeenAt ?? f.firstSeenAt });
  const sorted = [...byId.values()].filter((i) => Date.parse(i.publishedAt) >= since).sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  const kept: StartupNews[] = [];
  for (const item of sorted) {
    const dup = kept.find(
      (k) =>
        Math.abs(Date.parse(k.publishedAt) - Date.parse(item.publishedAt)) < 4 * 86_400_000 &&
        ((k.company && item.company && k.company.toLowerCase() === item.company.toLowerCase() && k.kind === item.kind) ||
          jaccard(titleTokens(k.title), titleTokens(item.title)) >= 0.6),
    );
    if (!dup) kept.push(item);
  }
  return { items: kept.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 80), statuses };
}

export function saveStartups(items: StartupNews[]): boolean {
  return writeJson(dataPath("startups.json"), items);
}
