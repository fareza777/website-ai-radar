import { LAB_ALIASES, PAPER_ORGS, PAPERS, PRESS, PRESS_QUERIES, PULSE } from "../../src/config/signals";
import type { PaperItem, PressItem, PulseItem, SourceStatus } from "../../src/lib/types";
import { parseFeed } from "./feed";
import { errorMessage, fetchJson, fetchText, pool } from "./http";
import { mergePress, splitHeadline } from "./stories";
import { dataPath, readJson, writeJson } from "./store";
import { daysAgo, normalizeUrl, parseDate, safeHttpUrl, safeRegex, shortHash, truncate } from "./text";

type Log = (m: string) => void;

function statusOf(id: string, name: string, target: string, now: Date, prev: SourceStatus | undefined, r: { ok: boolean; fetched: number; accepted: number; error?: string }): SourceStatus {
  const nowIso = now.toISOString();
  return {
    id, lab: "signals", name, type: "discover", target, lastRunAt: nowIso, ok: r.ok,
    lastSuccessAt: r.ok ? nowIso : prev?.lastSuccessAt ?? null, lastError: r.ok ? null : r.error ?? "failed", fetched: r.fetched, accepted: r.accepted,
  };
}

/** Whole-word match of any alias in text (aliases are lower-case; "z.ai" etc. allowed). */
export function labFromText(text: string): string | undefined {
  const t = text.toLowerCase();
  for (const [lab, aliases] of Object.entries(LAB_ALIASES)) {
    for (const a of aliases) {
      const esc = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`(?<![a-z0-9])${esc}`, "i").test(t)) return lab;
    }
  }
  return undefined;
}

function termWords(terms: string): string[] {
  return [...new Set(terms.replace(/["()]/g, " ").split(/\s+/).map((w) => w.toLowerCase()).filter((w) => w.length >= 3 && !["and", "ai"].includes(w) && w !== "or"))];
}

/** Community items must be recognizably about AI — the HN text search also matches page bodies. */
const AI_TITLE = /(\bai\b|\bllms?\b|gpt|chatgpt|claude|gemini|gemma|openai|anthropic|deepmind|grok|deepseek|qwen|kimi|\bglm\b|llama|mistral|nvidia|nemotron|copilot|codex|\bagents?\b|neural|machine learning|transformer|inference|\bmodels?\b|robot|autonom|benchmark|prompt|harness|embedding|vision|diffusion|cursor|\bmcp\b|opencode|coding|windsurf|devin|manus|perplexity|aider|cline)/i;

const idOfUrl = (url: string) => shortHash(normalizeUrl(url), 14);

// ───────────────────────── press (Google News per lab) ─────────────────────────

export async function collectPress(now: Date, log: Log, prevStatus: Map<string, SourceStatus>): Promise<{ items: PressItem[]; status: SourceStatus }> {
  const file = dataPath("press.json");
  const nowIso = now.toISOString();
  let archive = readJson<PressItem[]>(file, []).map((p) => ({ ...p, members: p.members ?? [p.id] }));
  const exclude = safeRegex(PRESS.exclude)!;
  let fetched = 0;
  let accepted = 0;
  let failed = 0;

  const results = await pool(PRESS_QUERIES, 3, async (q) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`(${q.terms}) when:${PRESS.window}`)}&hl=en-US&gl=US&ceid=US:en`;
    try {
      const entries = parseFeed(await fetchText(url, { retries: 1 }));
      return { lab: q.lab, entries, words: termWords(q.terms) };
    } catch (err) {
      failed++;
      log(`  ! press ${q.lab}: ${errorMessage(err)}`);
      return { lab: q.lab, entries: [], words: [] };
    }
  });

  for (const r of results) {
    const aliasHit = (title: string) => r.words.some((w) => title.toLowerCase().includes(w)) || labFromText(title) === r.lab;
    for (const e of r.entries.slice(0, PRESS.maxPerQuery)) {
      fetched++;
      const at = e.publishedAt;
      const link = safeHttpUrl(e.url);
      if (!at || !link || at.getTime() > now.getTime() + 6 * 3_600_000) continue;
      const { title, outlet } = splitHeadline(e.title, e.source);
      if (title.length < 20 || exclude.test(title) || !aliasHit(title)) continue;
      archive = mergePress(archive, { lab: r.lab, title, url: link, outlet, at }, idOfUrl, nowIso, PRESS.clusterSimilarity, PRESS.clusterDays);
      accepted++;
    }
  }

  const cutoff = daysAgo(now, PRESS.keepDays).toISOString();
  const items = archive
    .filter((p) => p.publishedAt >= cutoff)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, PRESS.maxArchive);
  const ok = failed <= PRESS_QUERIES.length / 2;
  log(`[press] ${ok ? "✓" : "✗"} queries=${PRESS_QUERIES.length} failed=${failed} fetched=${fetched} accepted=${accepted} archive=${items.length}`);
  // Failed run keeps the previous archive untouched.
  const kept = ok ? items : readJson<PressItem[]>(file, []);
  return {
    items: kept,
    status: statusOf("signals-press", "Press & media (Google News)", "news.google.com/rss/search", now, prevStatus.get("signals-press"), { ok, fetched, accepted, error: ok ? undefined : `${failed}/${PRESS_QUERIES.length} queries failed` }),
  };
}

// ───────────────────────── papers (Hugging Face Daily Papers) ─────────────────────────

interface HfPaper {
  paper: { id: string; title: string; summary?: string; publishedAt?: string; submittedOnDailyAt?: string; upvotes?: number; githubRepo?: string };
  title?: string;
  publishedAt?: string;
  organization?: { name?: string } | null;
}

export async function collectPapers(now: Date, log: Log, prevStatus: Map<string, SourceStatus>): Promise<{ items: PaperItem[]; status: SourceStatus }> {
  const file = dataPath("papers.json");
  const nowIso = now.toISOString();
  const prev = readJson<PaperItem[]>(file, []);
  const byId = new Map(prev.map((p) => [p.id, p]));
  let fetched = 0;
  let failed = 0;
  const days = [0, 1, 2, 3, 4, 5, 6].map((d) => new Date(now.getTime() - d * 86_400_000).toISOString().slice(0, 10));

  await pool(days, 3, async (day) => {
    try {
      const rows = await fetchJson<HfPaper[]>(`https://huggingface.co/api/daily_papers?date=${day}&limit=${PAPERS.fetchLimit}`, { retries: 1 });
      for (const r of rows) {
        fetched++;
        const id = r.paper?.id;
        const url = id ? `https://huggingface.co/papers/${id}` : null;
        if (!id || !url) continue;
        const orgSlug = r.organization?.name?.toLowerCase() ?? null;
        const lab = orgSlug ? PAPER_ORGS[orgSlug] : undefined;
        const upvotes = r.paper.upvotes ?? 0;
        if (!lab && upvotes < PAPERS.minUpvotesUnattributed) continue;
        const published = parseDate(r.paper.publishedAt ?? r.publishedAt)?.toISOString();
        if (!published) continue;
        const old = byId.get(id);
        byId.set(id, {
          id,
          title: r.paper.title ?? r.title ?? id,
          url,
          summary: truncate((r.paper.summary ?? "").replace(/\s+/g, " ").trim(), 420),
          publishedAt: published,
          submittedAt: parseDate(r.paper.submittedOnDailyAt)?.toISOString() ?? published,
          upvotes: Math.max(upvotes, old?.upvotes ?? 0),
          org: orgSlug,
          ...(lab ? { lab } : {}),
          ...(r.paper.githubRepo && safeHttpUrl(r.paper.githubRepo) ? { githubRepo: r.paper.githubRepo } : {}),
          firstSeenAt: old?.firstSeenAt ?? nowIso,
        });
      }
    } catch (err) {
      failed++;
      log(`  ! papers ${day}: ${errorMessage(err)}`);
    }
  });

  const cutoff = daysAgo(now, PAPERS.keepDays).toISOString();
  const items = [...byId.values()]
    .filter((p) => p.submittedAt >= cutoff)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.upvotes - a.upvotes)
    .slice(0, PAPERS.maxArchive);
  const ok = failed < days.length;
  log(`[papers] ${ok ? "✓" : "✗"} fetched=${fetched} archive=${items.length} (lab-attributed ${items.filter((p) => p.lab).length})`);
  return {
    items: ok ? items : prev,
    status: statusOf("signals-papers", "Hugging Face Daily Papers", "huggingface.co/api/daily_papers", now, prevStatus.get("signals-papers"), { ok, fetched, accepted: items.length, error: ok ? undefined : "all requests failed" }),
  };
}

// ───────────────────────── community pulse (Hacker News) ─────────────────────────

interface HnHit {
  objectID: string;
  title: string;
  url: string | null;
  points: number;
  num_comments: number;
  created_at: string;
}

export async function collectPulse(now: Date, log: Log, prevStatus: Map<string, SourceStatus>): Promise<{ items: PulseItem[]; status: SourceStatus }> {
  const file = dataPath("pulse.json");
  const nowIso = now.toISOString();
  const prev = readJson<PulseItem[]>(file, []);
  const byId = new Map(prev.map((p) => [p.id, p]));
  const since = Math.floor(daysAgo(now, PULSE.lookbackDays).getTime() / 1000);
  let fetched = 0;
  let failed = 0;

  await pool([...PULSE.queries], 4, async (q) => {
    try {
      const res = await fetchJson<{ hits: HnHit[] }>(
        `https://hn.algolia.com/api/v1/search?tags=story&query=${encodeURIComponent(q)}&numericFilters=created_at_i>${since},points>${PULSE.minPoints}&hitsPerPage=20`,
        { retries: 1 },
      );
      for (const h of res.hits) {
        fetched++;
        const hnUrl = `https://news.ycombinator.com/item?id=${h.objectID}`;
        const url = safeHttpUrl(h.url) ?? hnUrl;
        const lab = labFromText(`${h.title} ${h.url ?? ""}`);
        if (!lab && !AI_TITLE.test(h.title)) continue;
        const old = byId.get(h.objectID);
        byId.set(h.objectID, {
          id: h.objectID, title: h.title, url, hnUrl, points: Math.max(h.points, old?.points ?? 0), comments: Math.max(h.num_comments, old?.comments ?? 0),
          at: h.created_at, ...(lab ? { lab } : {}), firstSeenAt: old?.firstSeenAt ?? nowIso,
        });
      }
    } catch (err) {
      failed++;
      log(`  ! pulse "${q}": ${errorMessage(err)}`);
    }
  });

  const cutoff = daysAgo(now, PULSE.keepDays).toISOString();
  const items = [...byId.values()]
    .filter((p) => p.at >= cutoff && (p.lab || AI_TITLE.test(p.title)))
    .sort((a, b) => b.points - a.points)
    .slice(0, PULSE.maxArchive);
  const ok = failed <= PULSE.queries.length / 2;
  log(`[pulse] ${ok ? "✓" : "✗"} fetched=${fetched} archive=${items.length}`);
  return {
    items: ok ? items : prev,
    status: statusOf("signals-pulse", "Hacker News community pulse", "hn.algolia.com", now, prevStatus.get("signals-pulse"), { ok, fetched, accepted: items.length, error: ok ? undefined : `${failed} queries failed` }),
  };
}

export function saveSignals(press: PressItem[], papers: PaperItem[], pulse: PulseItem[]): boolean {
  const a = writeJson(dataPath("press.json"), press);
  const b = writeJson(dataPath("papers.json"), papers);
  const c = writeJson(dataPath("pulse.json"), pulse);
  return a || b || c;
}
