import { LAB_SOCIAL, SOCIAL, labFromHandle } from "../../src/config/signals";
import type { SocialPost, SourceStatus } from "../../src/lib/types";
import { THREADS_POST, type BuzzPost, type TipRef } from "./buzz";
import { errorMessage, fetchJson } from "./http";
import { dataPath, readJson, writeJson } from "./store";
import { daysAgo, parseDate, safeHttpUrl, truncate } from "./text";

type Log = (m: string) => void;

const X_STATUS_URL = /^https:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/status\/\d+/i;
const isSocialUrl = (u: string) => X_STATUS_URL.test(u) || THREADS_POST.test(u);

// ───────────────────────── pure mappers (unit tested) ─────────────────────────

/** X posts read through oEmbed (newsletters / tips) → Social stream. */
export function postsFromBuzz(buzz: readonly BuzzPost[], nowIso: string): SocialPost[] {
  return buzz.flatMap((b) => {
    const m = /\/status\/(\d+)/.exec(b.quote.url);
    if (!m) return [];
    const lab = labFromHandle(b.quote.handle);
    return [
      {
        id: `x:${m[1]}`,
        platform: "x" as const,
        handle: b.quote.handle,
        author: b.quote.author,
        ...(lab ? { lab } : {}),
        text: b.quote.text,
        url: b.quote.url,
        at: b.quote.date ?? nowIso,
        exactTime: !!b.quote.date,
        links: b.links.filter((l) => !isSocialUrl(l)).slice(0, 4),
        via: b.via === "tip" ? ("tip" as const) : ("newsletter" as const),
        official: !!lab,
        firstSeenAt: nowIso,
      },
    ];
  });
}

/** Threads URLs submitted as tips: kept link-only because reading Threads content requires an app token. */
export function threadsFromTips(tips: readonly TipRef[], nowIso: string): SocialPost[] {
  return tips.flatMap((t) => {
    const url = safeHttpUrl(t.x ?? "");
    const m = url ? THREADS_POST.exec(url) : null;
    if (!url || !m) return [];
    const lab = labFromHandle(m[1]);
    return [
      {
        id: `threads:${m[2]}`,
        platform: "threads" as const,
        handle: m[1],
        author: `@${m[1]}`,
        ...(lab ? { lab } : {}),
        text: "",
        url: url.split("?")[0],
        at: t.addedAt || nowIso,
        exactTime: false,
        links: [],
        via: "tip" as const,
        official: !!lab,
        firstSeenAt: nowIso,
      },
    ];
  });
}

interface XApiBody {
  data?: {
    id: string;
    text: string;
    created_at?: string;
    author_id: string;
    public_metrics?: { like_count?: number; retweet_count?: number; reply_count?: number; quote_count?: number };
    entities?: { urls?: { url: string; expanded_url?: string }[] };
  }[];
  includes?: { users?: { id: string; username: string; name?: string }[] };
  meta?: { next_token?: string };
}

/** X API v2 recent-search response → Social stream. Short t.co links are replaced by their expanded URLs. */
export function mapXApi(body: XApiBody, nowIso: string): SocialPost[] {
  const users = new Map((body.includes?.users ?? []).map((u) => [u.id, u]));
  return (body.data ?? []).flatMap((t) => {
    const user = users.get(t.author_id);
    if (!user) return [];
    let text = t.text;
    const links: string[] = [];
    for (const u of t.entities?.urls ?? []) {
      const expanded = u.expanded_url ? safeHttpUrl(u.expanded_url) : null;
      if (expanded && !isSocialUrl(expanded)) links.push(expanded);
      text = text.replace(u.url, expanded && !isSocialUrl(expanded) ? expanded : "").trim();
    }
    const lab = labFromHandle(user.username);
    const at = parseDate(t.created_at);
    return [
      {
        id: `x:${t.id}`,
        platform: "x" as const,
        handle: user.username,
        author: user.name ?? user.username,
        ...(lab ? { lab } : {}),
        text: text.replace(/\s+/g, " ").trim(),
        url: `https://x.com/${user.username}/status/${t.id}`,
        at: at ? at.toISOString() : nowIso,
        exactTime: !!at,
        likes: t.public_metrics?.like_count,
        reposts: t.public_metrics?.retweet_count,
        replies: t.public_metrics?.reply_count,
        links: [...new Set(links)].slice(0, 4),
        via: "x-api" as const,
        official: !!lab,
        firstSeenAt: nowIso,
      },
    ];
  });
}

export interface ThreadsRow {
  id?: string;
  text?: string;
  permalink?: string;
  timestamp?: string;
  username?: string;
  like_count?: number;
  reply_count?: number;
  repost_count?: number;
  quote_count?: number;
}

/** Threads API rows (keyword search / profile posts) → Social stream. Community posts need minLikes. */
export function mapThreads(rows: readonly ThreadsRow[], nowIso: string, minLikes: number): SocialPost[] {
  return rows.flatMap((r) => {
    const url = r.permalink ? safeHttpUrl(r.permalink) : null;
    const m = url ? THREADS_POST.exec(url) : null;
    if (!url || !m || !r.text) return [];
    const handle = r.username ?? m[1];
    const lab = labFromHandle(handle);
    const likes = r.like_count ?? 0;
    if (!lab && likes < minLikes) return [];
    const at = parseDate(r.timestamp);
    return [
      {
        id: `threads:${m[2]}`,
        platform: "threads" as const,
        handle,
        author: `@${handle}`,
        ...(lab ? { lab } : {}),
        text: truncate(r.text.replace(/\s+/g, " ").trim(), 500),
        url: url.split("?")[0],
        at: at ? at.toISOString() : nowIso,
        exactTime: !!at,
        likes,
        reposts: r.repost_count,
        replies: r.reply_count,
        links: [],
        via: "threads-api" as const,
        official: !!lab,
        firstSeenAt: nowIso,
      },
    ];
  });
}

/** Merge by id: richer data wins (text, metrics, exact time); first-seen time is preserved. */
export function mergeSocial(prev: readonly SocialPost[], incoming: readonly SocialPost[], now: Date, keepDays: number, max: number): SocialPost[] {
  const byId = new Map(prev.map((p) => [p.id, p]));
  for (const n of incoming) {
    const old = byId.get(n.id);
    if (!old) {
      byId.set(n.id, n);
      continue;
    }
    byId.set(n.id, {
      ...old,
      ...n,
      text: n.text || old.text,
      at: n.exactTime || !old.exactTime ? n.at : old.at,
      exactTime: n.exactTime || old.exactTime,
      likes: n.likes ?? old.likes,
      reposts: n.reposts ?? old.reposts,
      replies: n.replies ?? old.replies,
      links: n.links.length ? n.links : old.links,
      // An API-sourced record is more authoritative than a newsletter/tip sighting.
      via: n.via === "x-api" || n.via === "threads-api" ? n.via : old.via,
      firstSeenAt: old.firstSeenAt,
    });
  }
  const cutoff = daysAgo(now, keepDays).toISOString();
  return [...byId.values()].filter((p) => p.at >= cutoff).sort((a, b) => b.at.localeCompare(a.at)).slice(0, max);
}

/** X API query chunks that stay under the 512-character recent-search limit. */
export function xQueryChunks(handles: readonly string[], limit = 440): string[] {
  const suffix = " -is:retweet -is:reply";
  const chunks: string[] = [];
  let cur: string[] = [];
  const build = (list: string[]) => `(${list.map((h) => `from:${h}`).join(" OR ")})${suffix}`;
  for (const h of handles) {
    if (cur.length && build([...cur, h]).length > limit) {
      chunks.push(build(cur));
      cur = [];
    }
    cur.push(h);
  }
  if (cur.length) chunks.push(build(cur));
  return chunks;
}

// ───────────────────────── network collectors ─────────────────────────

async function fetchXApi(token: string, now: Date, log: Log): Promise<SocialPost[]> {
  const handles = Object.values(LAB_SOCIAL).flatMap((h) => h.x);
  const start = new Date(Math.max(now.getTime() - SOCIAL.xApiDays * 86_400_000, now.getTime() - 7 * 86_400_000 + 60_000)).toISOString();
  const out: SocialPost[] = [];
  let failures = 0;
  const chunks = xQueryChunks(handles);
  for (const query of chunks) {
    try {
      let next: string | undefined;
      for (let page = 0; page < 3; page++) {
        const q = new URLSearchParams({
          query, max_results: "100", start_time: start,
          "tweet.fields": "created_at,public_metrics,entities",
          expansions: "author_id", "user.fields": "username,name",
          ...(next ? { next_token: next } : {}),
        });
        const res = await fetch(`https://api.x.com/2/tweets/search/recent?${q}`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
        if (!res.ok) throw new Error(`X API HTTP ${res.status}`);
        const body = (await res.json()) as XApiBody;
        out.push(...mapXApi(body, now.toISOString()));
        next = body.meta?.next_token;
        if (!next) break;
      }
    } catch (err) {
      failures++;
      log(`  ! x-api chunk: ${errorMessage(err)}`);
    }
  }
  if (failures === chunks.length) throw new Error(`all ${chunks.length} X API queries failed`);
  return out;
}

const THREADS_FIELDS = "id,text,permalink,timestamp,username,like_count,reply_count,repost_count,quote_count";

async function fetchThreads(token: string, now: Date, log: Log): Promise<SocialPost[]> {
  const out: SocialPost[] = [];
  const calls: string[] = [
    ...SOCIAL.threadsKeywords.map((k) => `keyword_search?q=${encodeURIComponent(k)}&search_type=TOP`),
    ...Object.values(LAB_SOCIAL).flatMap((h) => h.threads).map((u) => `profile_posts?username=${encodeURIComponent(u)}`),
  ];
  let failures = 0;
  for (const path of calls) {
    try {
      const res = await fetchJson<{ data?: ThreadsRow[] }>(`https://graph.threads.net/v1.0/${path}&fields=${THREADS_FIELDS}&access_token=${encodeURIComponent(token)}`, { retries: 1 });
      out.push(...mapThreads(res.data ?? [], now.toISOString(), SOCIAL.threadsMinLikes));
    } catch (err) {
      failures++;
      log(`  ! threads ${path.split("?")[0]}: ${errorMessage(err).replace(token, "***")}`);
    }
  }
  if (calls.length && failures === calls.length) throw new Error(`all ${calls.length} Threads API calls failed`);
  return out;
}

function status(id: string, name: string, target: string, now: Date, prev: SourceStatus | undefined, r: { ok: boolean; skipped?: boolean; fetched: number; accepted: number; error?: string }): SourceStatus {
  const nowIso = now.toISOString();
  return {
    id, lab: "signals", name, type: "discover", target, lastRunAt: nowIso, ok: r.ok, ...(r.skipped ? { skipped: true } : {}),
    lastSuccessAt: r.ok ? nowIso : prev?.lastSuccessAt ?? null, lastError: r.ok ? null : r.error ?? "failed", fetched: r.fetched, accepted: r.accepted,
  };
}

export async function collectSocial(
  now: Date,
  log: Log,
  prevStatus: Map<string, SourceStatus>,
  buzzPosts: readonly BuzzPost[],
  threadsTips: readonly TipRef[],
): Promise<{ items: SocialPost[]; statuses: SourceStatus[] }> {
  const nowIso = now.toISOString();
  const file = dataPath("social.json");
  const prev = readJson<SocialPost[]>(file, []);
  const statuses: SourceStatus[] = [];
  const incoming: SocialPost[] = [];

  const viaLinks = [...postsFromBuzz(buzzPosts, nowIso), ...threadsFromTips(threadsTips, nowIso)];
  incoming.push(...viaLinks);
  statuses.push(status("signals-social-links", "X/Threads posts via newsletters & tips (oEmbed)", "publish.twitter.com/oembed", now, prevStatus.get("signals-social-links"), { ok: true, fetched: viaLinks.length, accepted: viaLinks.length }));

  const xToken = process.env.X_BEARER_TOKEN?.trim();
  if (!xToken) {
    statuses.push(status("signals-x-api", "X API v2 — official lab accounts", "api.x.com", now, prevStatus.get("signals-x-api"), { ok: false, skipped: true, fetched: 0, accepted: 0, error: "Not configured — set X_BEARER_TOKEN to ingest official lab posts" }));
  } else {
    try {
      const posts = await fetchXApi(xToken, now, log);
      incoming.push(...posts);
      statuses.push(status("signals-x-api", "X API v2 — official lab accounts", "api.x.com", now, prevStatus.get("signals-x-api"), { ok: true, fetched: posts.length, accepted: posts.length }));
      log(`[social] ✓ x-api ${posts.length}`);
    } catch (err) {
      statuses.push(status("signals-x-api", "X API v2 — official lab accounts", "api.x.com", now, prevStatus.get("signals-x-api"), { ok: false, fetched: 0, accepted: 0, error: errorMessage(err) }));
      log(`[social] ✗ x-api ${errorMessage(err)}`);
    }
  }

  const thToken = process.env.THREADS_ACCESS_TOKEN?.trim();
  if (!thToken) {
    statuses.push(status("signals-threads-api", "Threads API — keyword & profile posts", "graph.threads.net", now, prevStatus.get("signals-threads-api"), { ok: false, skipped: true, fetched: 0, accepted: 0, error: "Not configured — set THREADS_ACCESS_TOKEN to ingest Threads posts" }));
  } else {
    try {
      const posts = await fetchThreads(thToken, now, log);
      incoming.push(...posts);
      statuses.push(status("signals-threads-api", "Threads API — keyword & profile posts", "graph.threads.net", now, prevStatus.get("signals-threads-api"), { ok: true, fetched: posts.length, accepted: posts.length }));
      log(`[social] ✓ threads-api ${posts.length}`);
    } catch (err) {
      statuses.push(status("signals-threads-api", "Threads API — keyword & profile posts", "graph.threads.net", now, prevStatus.get("signals-threads-api"), { ok: false, fetched: 0, accepted: 0, error: errorMessage(err).replace(thToken, "***") }));
      log(`[social] ✗ threads-api ${errorMessage(err).replace(thToken, "***")}`);
    }
  }

  const items = mergeSocial(prev, incoming, now, SOCIAL.keepDays, SOCIAL.maxArchive);
  log(`[social] archive=${items.length} (official ${items.filter((p) => p.official).length}) changed=${writeJson(file, items)}`);
  return { items, statuses };
}
