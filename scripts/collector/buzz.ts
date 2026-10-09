import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BUZZ } from "../../src/config/buzz";
import { LABS } from "../../src/config/labs";
import type { Signal, SourceStatus, XQuote } from "../../src/lib/types";
import type { Candidate } from "./candidate";
import { parseFeed } from "./feed";
import { errorMessage, fetchJson } from "./http";
import { daysAgo, decodeEntities, normalizeUrl, parseDate, safeHttpUrl, safeRegex, stripHtml, truncate } from "./text";

// ---------------------------------------------------------------- helpers

const LAB_HOSTS = LABS.flatMap((l) => l.domains.filter((d) => !d.includes("/")));
const LAB_HANDLES = new Set<string>(BUZZ.labHandles.map((h) => h.toLowerCase()));
const X_STATUS = /^https:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status\/(\d+)/;
const GH_REPO = /^https:\/\/github\.com\/(?!\.+\/)([\w.-]+)\/(?!\.+\/?$)([\w.-]+)\/?$/i;
const AI_RELEVANT = /(\bai\b|\bagents?\b|agentic|\bllms?\b|\bmodels?\b|gpt|claude|codex|gemini|cursor|automat|inference|machine learning|copilot|chatbot|\brag\b|\bmcp\b|open[- ]source|embedding|voice|prompt|vibe[- ]cod)/i;
const LAUNCH_WORDS = /\b(introducing|launch(ed|ing)?|just shipped|shipping|now live|is live|announcing|open[- ]sourc(e|ed|ing)|beta|we built|i built|releas(e|ed|ing))\b/i;

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function hostMatches(h: string, domains: readonly string[]): boolean {
  return domains.some((d) => h === d || h.endsWith(`.${d}`));
}

/** True when a URL can represent a third-party product (not social/news/platform/lab). */
export function isProductUrl(url: string): boolean {
  const safe = safeHttpUrl(url);
  if (!safe) return false;
  const h = host(safe);
  if (!h || hostMatches(h, BUZZ.excludeDomains) || hostMatches(h, LAB_HOSTS)) return false;
  // Company blogs/newsrooms/docs are articles, not products.
  if (/^(blog|news|newsroom|press|docs|support|help|status)\./.test(h)) return false;
  if (h === "github.com") return GH_REPO.test(safe.split(/[?#]/)[0]);
  return true;
}

/** Stable identity for a product URL: origin + path (no query/hash/trailing slash). */
export function productKey(url: string): string {
  const u = new URL(url);
  const path = u.pathname.replace(/\/+$/, "");
  return `url:${normalizeUrl(`${u.origin}${path}`)}`;
}

function pathDepth(url: string): number {
  return new URL(url).pathname.split("/").filter(Boolean).length;
}

async function resolveRedirects(url: string, hops = 4): Promise<string | null> {
  let current = url;
  for (let i = 0; i < hops; i++) {
    try {
      const res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { "user-agent": "Mozilla/5.0 AIRadarBot" } });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        current = new URL(loc, current).toString();
        continue;
      }
      return current;
    } catch {
      return null;
    }
  }
  return current;
}

// ---------------------------------------------------------------- X via official oEmbed

export interface XPost {
  quote: XQuote;
  links: string[];
}

/** Reads a public X post through the official oEmbed endpoint (no scraping, no login). */
export async function readXPost(postUrl: string): Promise<XPost | null> {
  const m = X_STATUS.exec(postUrl);
  if (!m) return null;
  const canonical = `https://x.com/${m[1]}/status/${m[2]}`;
  const res = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(canonical)}&omit_script=1&dnt=1`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { html?: string; author_name?: string };
  const html = body.html ?? "";
  const p = /<p[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? "";
  const text = stripHtml(p.replace(/<br\s*\/?>/gi, " \n "))
    .replace(/\s*pic\.twitter\.com\/\w+/g, "")
    .replace(/\s*https?:\/\/t\.co\/\w+/g, "") // short links are resolved separately into `links`
    .trim();
  const dateText = [...html.matchAll(/<a[^>]*>([^<]+)<\/a>\s*<\/blockquote>/g)].at(-1)?.[1];
  const date = parseDate(dateText);
  const tco = [...p.matchAll(/href="(https:\/\/t\.co\/[A-Za-z0-9]+)"/g)].map((x) => x[1]);
  const links: string[] = [];
  for (const short of tco) {
    const final = await resolveRedirects(short);
    if (final && !X_STATUS.test(final) && !/(?:x|twitter)\.com\/.*\/(photo|video)\//.test(final)) links.push(final);
  }
  return {
    quote: { text: truncate(text, 400), author: body.author_name ?? m[1], handle: m[1], url: canonical, date: date ? date.toISOString() : null },
    links,
  };
}

// ---------------------------------------------------------------- product page metadata

export interface PageMeta {
  url: string;
  name: string;
  description: string;
}

function metaContent(html: string, key: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i");
  const tag = re.exec(html)?.[0];
  const content = tag ? /content=["']([^"']*)["']/i.exec(tag)?.[1] : null;
  return content ? decodeEntities(content).trim() : null;
}

export async function pageMeta(url: string): Promise<PageMeta | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36", "accept-language": "en-US,en;q=0.9" },
    });
    if (!res.ok || !/text\/html/i.test(res.headers.get("content-type") ?? "")) return null;
    const html = (await res.text()).slice(0, 600_000);
    const finalUrl = safeHttpUrl(res.url) ?? url;
    const title = stripHtml(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
    const site = metaContent(html, "og:site_name");
    const ogTitle = metaContent(html, "og:title");
    const name = (site || ogTitle || title).split(/\s[|–—·:-]\s/)[0].trim();
    const description = metaContent(html, "og:description") || metaContent(html, "description") || "";
    if (!name) return null;
    return { url: finalUrl, name: truncate(name, 60), description: truncate(stripHtml(description), 280) };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- sources

export interface Sighting {
  url: string;
  signal: Signal;
  quote?: XQuote;
  /** Text describing the product when the page has no metadata (anchor text / tweet). */
  hint?: string;
  launch: boolean;
  at: string;
}

interface NewsletterResult {
  products: Sighting[];
  xPosts: { url: string; signal: Signal }[];
}

async function fromNewsletters(now: Date): Promise<NewsletterResult> {
  const since = daysAgo(now, BUZZ.newsletterLookbackDays).getTime();
  const products: Sighting[] = [];
  const xPosts: { url: string; signal: Signal }[] = [];
  for (const nl of BUZZ.newsletters) {
    const entries = parseFeed(await (await fetch(nl.url, { signal: AbortSignal.timeout(25_000), headers: { "user-agent": "Mozilla/5.0 AIRadarBot" } })).text());
    for (const e of entries) {
      const at = e.publishedAt ?? e.updatedAt;
      if (!at || at.getTime() < since) continue;
      const issueUrl = safeHttpUrl(e.url) ?? nl.url;
      const signal: Signal = { source: "newsletter", label: `Featured in ${nl.name}`, url: issueUrl, value: 1, at: at.toISOString() };
      const html = decodeEntities(e.html);
      for (const a of html.matchAll(/<a[^>]+href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
        const href = safeHttpUrl(decodeEntities(a[1]));
        const anchor = stripHtml(a[2]);
        if (!href) continue;
        const x = X_STATUS.exec(href);
        if (x) {
          if (!LAB_HANDLES.has(x[1].toLowerCase())) xPosts.push({ url: href, signal });
          continue;
        }
        // Product mentions are short proper names ("Executor", "Rhem") linking to a homepage or repo.
        const words = anchor.split(/\s+/).filter(Boolean).length;
        if (!isProductUrl(href) || words === 0 || words > 4) continue;
        if (host(href) !== "github.com" && pathDepth(href) > 1) continue;
        products.push({ url: href, signal, hint: anchor, launch: false, at: at.toISOString() });
      }
    }
  }
  return { products, xPosts };
}

export interface GhIssue {
  number: number;
  html_url: string;
  title: string;
  body: string | null;
  state: string;
  created_at: string;
  author_association: string;
  labels: { name: string }[];
  pull_request?: unknown;
}

export interface TipRef {
  issue?: number;
  issueUrl?: string;
  x?: string;
  url?: string;
  note?: string;
  /** "cursor" when added by the daily research agent (shown as "Agent pick"); absent = editor. */
  by?: string;
  addedAt: string;
}

const TIPS_FILE = join(process.cwd(), "src", "config", "tips.json");

function issueField(body: string, label: string): string | null {
  const re = new RegExp(`###\\s*${label}[^\\n]*\\n+([\\s\\S]*?)(?=\\n###|$)`, "i");
  const v = re.exec(body)?.[1]?.trim();
  return v && v !== "_No response_" ? v : null;
}

function firstUrl(text: string | null): string | null {
  const m = text ? /https?:\/\/[^\s)>\]]+/.exec(text) : null;
  return m ? safeHttpUrl(m[0]) : null;
}

/** Tips = approved GitHub issues labeled `radar-tip` + entries in src/config/tips.json. */
export async function loadTips(now: Date): Promise<{ tips: TipRef[]; issues: GhIssue[] }> {
  const tips: TipRef[] = [];
  if (existsSync(TIPS_FILE)) {
    const manual = JSON.parse(readFileSync(TIPS_FILE, "utf8")) as TipRef[];
    tips.push(...manual.filter((t) => (t.url || t.x) && Date.parse(t.addedAt) >= daysAgo(now, BUZZ.tips.keepDays).getTime()));
  }
  const repo = process.env.GITHUB_REPOSITORY || BUZZ.tips.repo;
  const issues = await fetchJson<GhIssue[]>(`https://api.github.com/repos/${repo}/issues?labels=${BUZZ.tips.label}&state=all&per_page=50&sort=created&direction=desc`);
  for (const i of issues) {
    if (i.pull_request || Date.parse(i.created_at) < daysAgo(now, BUZZ.tips.keepDays).getTime()) continue;
    const labels = new Set(i.labels.map((l) => l.name));
    const trusted = (BUZZ.tips.trustedAssociations as readonly string[]).includes(i.author_association) || labels.has(BUZZ.tips.approvedLabel);
    if (!trusted || labels.has("rejected")) continue;
    const body = i.body ?? "";
    const x = firstUrl(issueField(body, "X post")) ?? firstUrl(body.match(X_STATUS)?.[0] ?? null);
    const url = firstUrl(issueField(body, "Product"));
    if (!x && !url) continue;
    tips.push({ issue: i.number, issueUrl: i.html_url, x: x ?? undefined, url: url ?? undefined, note: issueField(body, "Why") ?? undefined, addedAt: i.created_at });
  }
  return { tips, issues };
}

async function fromXApi(): Promise<{ url: string; likes: number }[] | null> {
  const token = process.env.X_BEARER_TOKEN?.trim();
  if (!token) return null;
  const q = new URLSearchParams({
    query: BUZZ.xApi.query,
    max_results: String(Math.min(100, Math.max(10, BUZZ.xApi.maxResults))),
    "tweet.fields": "public_metrics,author_id,created_at",
    expansions: "author_id",
    "user.fields": "username",
  });
  const res = await fetch(`https://api.x.com/2/tweets/search/recent?${q}`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`X API HTTP ${res.status}`);
  const body = (await res.json()) as {
    data?: { id: string; author_id: string; public_metrics?: { like_count?: number } }[];
    includes?: { users?: { id: string; username: string }[] };
  };
  const users = new Map((body.includes?.users ?? []).map((u) => [u.id, u.username]));
  return (body.data ?? [])
    .map((t) => ({ handle: users.get(t.author_id), id: t.id, likes: t.public_metrics?.like_count ?? 0 }))
    .filter((t): t is { handle: string; id: string; likes: number } => !!t.handle && t.likes >= BUZZ.xApi.minLikes && !LAB_HANDLES.has(t.handle.toLowerCase()))
    .map((t) => ({ url: `https://x.com/${t.handle}/status/${t.id}`, likes: t.likes }));
}

interface HfSpace {
  id: string;
  likes: number;
  trendingScore?: number;
  createdAt?: string;
  cardData?: { title?: string; short_description?: string };
  private?: boolean;
}

async function fromHfSpaces(): Promise<Candidate[]> {
  const spaces = await fetchJson<HfSpace[]>("https://huggingface.co/api/spaces?sort=trendingScore&direction=-1&limit=60&full=true");
  const exclude = safeRegex(BUZZ.hfSpaces.exclude)!;
  const out: Candidate[] = [];
  for (const s of spaces) {
    const desc = s.cardData?.short_description ?? "";
    if (s.private || s.likes < BUZZ.hfSpaces.minLikes || exclude.test(`${s.id} ${desc} ${s.cardData?.title ?? ""}`)) continue;
    const url = `https://huggingface.co/spaces/${s.id}`;
    out.push({
      key: `hf:${s.id.toLowerCase()}`,
      name: s.cardData?.title || s.id.split("/")[1],
      url,
      kind: "hf-space",
      description: truncate(desc, 280),
      createdAt: parseDate(s.createdAt)?.toISOString() ?? null,
      dateKind: "created",
      topics: [],
      signals: [{ source: "huggingface", label: `${s.likes} likes · trending on HF Spaces`, url, value: s.trendingScore ?? s.likes, at: new Date().toISOString() }],
    });
    if (out.length >= BUZZ.hfSpaces.max) break;
  }
  return out;
}

// ---------------------------------------------------------------- orchestration

export interface BuzzOutput {
  candidates: Candidate[];
  /** Websites/repos needing full candidate construction by discover.ts (GitHub repos use its repo API). */
  repoSightings: { fullName: string; signal: Signal; quote?: XQuote }[];
  statuses: SourceStatus[];
  tipResults: { tip: TipRef; ok: boolean; name?: string; reason?: string }[];
  tips: TipRef[];
  issues: GhIssue[];
}

export interface KnownLookup {
  (key: string): { name: string; description: string; url: string } | undefined;
}

export async function collectBuzz(now: Date, known: KnownLookup, log: (m: string) => void): Promise<BuzzOutput> {
  const nowIso = now.toISOString();
  const statuses: SourceStatus[] = [];
  const sightings: Sighting[] = [];
  const xQueue: { url: string; signal: Signal; tip?: TipRef }[] = [];
  const tipResults: BuzzOutput["tipResults"] = [];
  const candidates: Candidate[] = [];

  const track = async (id: string, name: string, target: string, fn: () => Promise<number | null>) => {
    const base = { id, lab: "discover", name, type: "discover" as const, target, lastRunAt: nowIso };
    try {
      const n = await fn();
      if (n === null) {
        statuses.push({ ...base, ok: false, skipped: true, lastSuccessAt: null, lastError: "Not configured (optional)", fetched: 0, accepted: 0 });
        return;
      }
      statuses.push({ ...base, ok: true, lastSuccessAt: nowIso, lastError: null, fetched: n, accepted: n });
      log(`[buzz] ✓ ${id} ${n}`);
    } catch (err) {
      statuses.push({ ...base, ok: false, lastSuccessAt: null, lastError: errorMessage(err), fetched: 0, accepted: 0 });
      log(`[buzz] ✗ ${id} ${errorMessage(err)}`);
    }
  };

  // 1) Tips (highest trust: picked by the editor).
  const tipsList: TipRef[] = [];
  let issues: GhIssue[] = [];
  await track("buzz-tips", "Tips (GitHub Issues + tips.json)", "radar-tip issues", async () => {
    const res = await loadTips(now);
    tipsList.push(...res.tips);
    issues = res.issues;
    return res.tips.length;
  });
  for (const tip of tipsList) {
    const signal: Signal = { source: "tip", label: tip.by ? "Agent pick (daily research)" : "Editor's pick", url: tip.issueUrl ?? tip.x ?? tip.url ?? "", value: 1, at: tip.addedAt };
    if (tip.x) xQueue.push({ url: tip.x, signal, tip });
    if (tip.url && isProductUrl(tip.url)) sightings.push({ url: tip.url, signal, hint: tip.note, launch: false, at: tip.addedAt });
    else if (tip.url) tipResults.push({ tip, ok: false, reason: "URL is a social/news/lab link — please submit the product's own website or GitHub repo" });
  }

  // 2) Newsletters that curate AI Twitter.
  await track("buzz-newsletters", "Newsletters (Ben's Bites)", BUZZ.newsletters.map((n) => n.url).join(", "), async () => {
    const res = await fromNewsletters(now);
    sightings.push(...res.products);
    xQueue.push(...res.xPosts);
    return res.products.length + res.xPosts.length;
  });

  // 3) Optional X API.
  await track("buzz-x-api", "X API v2 recent search", "api.x.com", async () => {
    const posts = await fromXApi();
    if (!posts) return null;
    for (const p of posts) xQueue.push({ url: p.url, signal: { source: "x", label: `${p.likes} likes on X`, url: p.url, value: p.likes, at: nowIso } });
    return posts.length;
  });

  // Read X posts via oEmbed (tips first, then the rest), de-duplicated and capped.
  const seenPosts = new Set<string>();
  const queue = [...xQueue.filter((q) => q.tip), ...xQueue.filter((q) => !q.tip)];
  let xRead = 0;
  await track("buzz-x-oembed", "X posts via official oEmbed", "publish.twitter.com", async () => {
    for (const q of queue) {
      const id = X_STATUS.exec(q.url)?.[2];
      if (!id || seenPosts.has(id) || xRead >= BUZZ.maxXPosts) continue;
      seenPosts.add(id);
      xRead++;
      const post = await readXPost(q.url).catch(() => null);
      if (!post) {
        if (q.tip) tipResults.push({ tip: q.tip, ok: false, reason: "X post could not be read (deleted, private, or age-restricted)" });
        continue;
      }
      const xSignal: Signal = q.signal.source === "tip" ? q.signal : { source: "x", label: `Buzzing on X · @${post.quote.handle}`, url: post.quote.url, value: q.signal.value, at: post.quote.date ?? q.signal.at };
      const extra: Signal[] = q.signal.source === "newsletter" ? [q.signal] : [];
      // Product links from posts must look like a homepage/repo (not an article or episode page).
      const products = post.links.filter((l) => isProductUrl(l) && (host(l) === "github.com" || pathDepth(l) <= 1));
      if (!products.length && q.tip && !q.tip.url) tipResults.push({ tip: q.tip, ok: false, reason: "The X post has no product link — add the product URL to the tip" });
      for (const url of products.slice(0, 2)) {
        const launch = LAUNCH_WORDS.test(post.quote.text);
        sightings.push({ url, signal: xSignal, quote: post.quote, hint: post.quote.text, launch, at: post.quote.date ?? nowIso });
        for (const s of extra) sightings.push({ url, signal: s, launch, at: s.at });
      }
    }
    return xRead;
  });

  // 4) HF trending Spaces.
  await track("buzz-hf-spaces", "Hugging Face trending Spaces", "huggingface.co/api/spaces", async () => {
    const c = await fromHfSpaces();
    candidates.push(...c);
    return c.length;
  });

  // ---- turn sightings into candidates (GitHub repos are handed back to discover.ts)
  const repoSightings: BuzzOutput["repoSightings"] = [];
  const byKey = new Map<string, Sighting[]>();
  for (const s of sightings) {
    const clean = s.url.split("#")[0];
    const gh = GH_REPO.exec(clean.split("?")[0]);
    if (gh) {
      repoSightings.push({ fullName: `${gh[1]}/${gh[2]}`, signal: s.signal, quote: s.quote });
      continue;
    }
    const key = productKey(clean);
    byKey.set(key, [...(byKey.get(key) ?? []), s]);
  }

  let fetches = 0;
  for (const [key, list] of byKey) {
    const first = list[0];
    const prev = known(key);
    let meta = prev ? { url: prev.url, name: prev.name, description: prev.description } : null;
    if (!meta && fetches < BUZZ.maxPageFetches) {
      fetches++;
      meta = await pageMeta(first.url);
    }
    const tipSignal = list.find((s) => s.signal.source === "tip");
    // Redirects can land on excluded domains (e.g. ai.studio → aistudio.google.com).
    if (meta && !tipSignal && !isProductUrl(meta.url)) continue;
    if (meta) meta = { ...meta, url: normalizeUrl(meta.url) };
    // Non-tip sightings must be about AI (tips are trusted editor picks).
    if (meta && !tipSignal && !AI_RELEVANT.test(`${meta.name} ${meta.description} ${list.map((s) => s.hint ?? "").join(" ")}`)) continue;
    if (!meta) {
      // A product we cannot load is not published (we never invent a name/description).
      for (const s of list) {
        const tip = tipsList.find((t) => t.addedAt === s.at && (t.url === s.url || t.x === s.quote?.url));
        if (tip) tipResults.push({ tip, ok: false, reason: `Product page could not be loaded: ${first.url}` });
      }
      continue;
    }
    const quote = list.find((s) => s.quote)?.quote;
    const launchSighting = list.find((s) => s.launch);
    const spotted = [...list].sort((a, b) => a.at.localeCompare(b.at))[0].at;
    candidates.push({
      key,
      name: meta.name,
      url: meta.url,
      kind: tipSignal ? "tip" : quote ? "x" : "newsletter",
      description: meta.description || truncate(first.hint ?? "", 280),
      createdAt: launchSighting?.at ?? spotted,
      dateKind: "spotted",
      topics: [],
      signals: list.map((s) => s.signal),
      ...(quote ? { quote } : {}),
    });
    for (const t of tipsList) {
      const matches = list.some((s) => s.signal.source === "tip" && s.at === t.addedAt);
      if (matches) tipResults.push({ tip: t, ok: true, name: meta.name });
    }
  }
  return { candidates, repoSightings, statuses, tipResults, tips: tipsList, issues };
}

// ---------------------------------------------------------------- GitHub issue write-back

export interface TipOutcomeLike {
  tip: TipRef;
  ok: boolean;
  name?: string;
  reason?: string;
}

/**
 * Replies on tip issues (only when TIPS_WRITEBACK=1, i.e. in GitHub Actions with issues:write):
 * success → comment + `added` label + close; failure → one comment + `needs-info` label (left open).
 */
export async function writeBackTips(outcomes: TipOutcomeLike[], issues: GhIssue[], siteUrl: string, log: (m: string) => void): Promise<void> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (process.env.TIPS_WRITEBACK !== "1" || !token) return;
  const repo = process.env.GITHUB_REPOSITORY || BUZZ.tips.repo;
  const api = (path: string, method: string, body: unknown) =>
    fetch(`https://api.github.com/repos/${repo}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  for (const o of outcomes) {
    const issue = issues.find((i) => i.number === o.tip.issue);
    if (!issue || issue.state !== "open") continue;
    const labels = new Set(issue.labels.map((l) => l.name));
    try {
      if (o.ok && !labels.has("added")) {
        await api(`/issues/${issue.number}/comments`, "POST", { body: `✅ Added to AI Radar Discover as **${o.name}** → ${siteUrl}/discover\n\n_Automated reply from the collector._` });
        await api(`/issues/${issue.number}/labels`, "POST", { labels: ["added"] });
        await api(`/issues/${issue.number}`, "PATCH", { state: "closed", state_reason: "completed" });
        log(`[tips] #${issue.number} added (${o.name})`);
      } else if (!o.ok && !labels.has("needs-info")) {
        await api(`/issues/${issue.number}/comments`, "POST", { body: `⚠️ Could not add this tip yet: ${o.reason ?? "unknown reason"}.\n\nEdit the issue (e.g. add the product's website or GitHub URL) and remove the \`needs-info\` label to retry.\n\n_Automated reply from the collector._` });
        await api(`/issues/${issue.number}/labels`, "POST", { labels: ["needs-info"] });
        log(`[tips] #${issue.number} needs info: ${o.reason}`);
      }
    } catch (err) {
      log(`[tips] write-back failed for #${issue.number}: ${errorMessage(err)}`);
    }
  }
}
