import { DISCOVER } from "../../src/config/discover";
import type { DiscoverItem, DiscoverKind, Signal, SourceStatus } from "../../src/lib/types";
import { collectBuzz, type GhIssue, type TipRef } from "./buzz";
import type { Candidate } from "./candidate";
import { errorMessage, fetchJson, sleep } from "./http";
import { dataPath, readJson, writeJson } from "./store";
import { daysAgo, normalizeUrl, safeHttpUrl, safeRegex, shortHash, truncate } from "./text";

interface GhRepo {
  full_name: string;
  html_url: string;
  homepage: string | null;
  description: string | null;
  created_at: string;
  pushed_at: string;
  stargazers_count: number;
  language: string | null;
  license: { spdx_id: string | null } | null;
  topics?: string[];
  fork: boolean;
  archived: boolean;
}

interface HnHit {
  objectID: string;
  title: string;
  url: string | null;
  points: number;
  num_comments: number;
  created_at: string;
}


const hasToken = () => Boolean(process.env.GITHUB_TOKEN || process.env.GH_TOKEN);

function repoKey(fullName: string): string {
  return `gh:${fullName.toLowerCase()}`;
}

function fromRepo(r: GhRepo, signal: Signal): Candidate {
  return {
    key: repoKey(r.full_name),
    name: r.full_name.split("/")[1],
    url: r.homepage && /^https?:\/\//.test(r.homepage) ? r.homepage : r.html_url,
    repo: r.full_name,
    kind: "github",
    description: truncate(r.description ?? "", 300),
    createdAt: r.created_at,
    stars: r.stargazers_count,
    language: r.language,
    license: r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION" ? r.license.spdx_id : null,
    topics: (r.topics ?? []).slice(0, 8),
    signals: [signal],
  };
}

async function githubSearch(now: Date, log: (m: string) => void): Promise<Candidate[]> {
  const since = daysAgo(now, DISCOVER.github.createdWithinDays).toISOString().slice(0, 10);
  const out: Candidate[] = [];
  let failures = 0;
  for (const q of DISCOVER.github.queries) {
    const query = `${q} created:>${since} stars:>${DISCOVER.github.minStars} fork:false archived:false`;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=20`;
    try {
      const res = await fetchJson<{ items: GhRepo[] }>(url);
      for (const r of res.items) {
        out.push(fromRepo(r, { source: "github", label: `${r.stargazers_count.toLocaleString("en-US")} stars`, url: r.html_url, value: r.stargazers_count, at: now.toISOString() }));
      }
    } catch (err) {
      failures++;
      log(`  ! github search "${q}": ${errorMessage(err)}`);
    }
    // Search API: 10 req/min unauthenticated, 30 req/min with a token.
    await sleep(hasToken() ? 2200 : 6500);
  }
  // Report the source as failed (keeping previous items) when most queries failed, e.g. rate limited.
  if (failures > DISCOVER.github.queries.length / 2) throw new Error(`${failures}/${DISCOVER.github.queries.length} GitHub search queries failed`);
  return out;
}

async function hnSearch(path: string): Promise<HnHit[]> {
  const res = await fetchJson<{ hits: HnHit[] }>(`https://hn.algolia.com/api/v1/${path}`);
  return res.hits ?? [];
}

const GH_REPO_URL = /^https:\/\/github\.com\/(?!\.+\/)([\w.-]+)\/(?!\.+\/?$)([\w.-]+)\/?$/i;

function cleanShowHnTitle(title: string): { name: string; description: string } {
  const t = title.replace(/^(show|launch) hn:\s*/i, "").trim();
  const m = /^(.+?)\s+[–—-]\s+(.+)$/.exec(t) ?? /^(.+?):\s+(.+)$/.exec(t);
  return m ? { name: m[1].trim(), description: m[2].trim() } : { name: t, description: t };
}

async function hackerNews(now: Date): Promise<{ candidates: Candidate[]; repoRefs: Map<string, Signal> }> {
  const since = Math.floor(daysAgo(now, DISCOVER.hackernews.lookbackDays).getTime() / 1000);
  const keyword = safeRegex(DISCOVER.hackernews.keyword)!;
  const [stories, shows] = await Promise.all([
    hnSearch(`search?tags=story&numericFilters=created_at_i>${since},points>${DISCOVER.hackernews.minPoints}&hitsPerPage=1000`),
    hnSearch(`search?tags=show_hn&numericFilters=created_at_i>${since},points>${DISCOVER.hackernews.showHnMinPoints}&hitsPerPage=500`),
  ]);
  const candidates: Candidate[] = [];
  const repoRefs = new Map<string, Signal>();
  const seen = new Set<string>();

  for (const hit of [...shows, ...stories]) {
    const hitUrl = safeHttpUrl(hit.url);
    if (!hitUrl || seen.has(hit.objectID) || !keyword.test(hit.title)) continue;
    seen.add(hit.objectID);
    const signal: Signal = {
      source: "hackernews",
      label: `${hit.points} HN points · ${hit.num_comments} comments`,
      url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      value: hit.points,
      at: hit.created_at,
    };
    const gh = GH_REPO_URL.exec(hitUrl.replace(/\.git$/, ""));
    if (gh) {
      const full = `${gh[1]}/${gh[2]}`;
      const prev = repoRefs.get(full.toLowerCase());
      if (!prev || prev.value < signal.value) repoRefs.set(full.toLowerCase(), signal);
      continue;
    }
    const isLaunch = /^(show|launch) hn:/i.test(hit.title);
    if (!isLaunch) continue; // plain news stories are news, not products
    const { name, description } = cleanShowHnTitle(hit.title);
    candidates.push({
      key: `url:${normalizeUrl(hitUrl)}`,
      name: truncate(name, 60),
      url: hitUrl,
      kind: "show-hn",
      description: truncate(description, 300),
      // A Show HN post is the public launch moment of the product.
      createdAt: hit.created_at,
      signals: [signal],
    });
  }
  return { candidates, repoRefs };
}

async function repoDetails(fullNames: string[], log: (m: string) => void): Promise<GhRepo[]> {
  const out: GhRepo[] = [];
  const cap = hasToken() ? 60 : 15; // stay well inside unauthenticated core limits
  const names = fullNames.slice(0, cap);
  let failures = 0;
  for (const name of names) {
    try {
      const r = await fetchJson<GhRepo>(`https://api.github.com/repos/${name}`);
      if (!r.fork && !r.archived) out.push(r);
    } catch (err) {
      failures++;
      log(`  ! repo ${name}: ${errorMessage(err)}`);
    }
  }
  if (names.length && failures > names.length / 2) throw new Error(`${failures}/${names.length} repo lookups failed`);
  return out;
}

interface PhPost {
  node: { id: string; name: string; tagline: string; description: string | null; website: string; url: string; votesCount: number; createdAt: string; topics: { edges: { node: { name: string } }[] } };
}

async function productHunt(now: Date): Promise<Candidate[] | null> {
  const token = process.env.PRODUCT_HUNT_TOKEN?.trim();
  if (!token) return null;
  const postedAfter = daysAgo(now, DISCOVER.productHunt.lookbackDays).toISOString();
  const query = `query($after: DateTime!, $topic: String!, $first: Int!) {
    posts(order: VOTES, postedAfter: $after, topic: $topic, first: $first) {
      edges { node { id name tagline description website url votesCount createdAt topics(first: 5) { edges { node { name } } } } }
    }
  }`;
  const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query, variables: { after: postedAfter, topic: DISCOVER.productHunt.topic, first: DISCOVER.productHunt.max } }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Product Hunt HTTP ${res.status}`);
  const body = (await res.json()) as { data?: { posts?: { edges: PhPost[] } }; errors?: { message: string }[] };
  if (body.errors?.length) throw new Error(body.errors[0].message);
  return (body.data?.posts?.edges ?? []).flatMap(({ node }) => {
    const url = safeHttpUrl(node.website) ?? safeHttpUrl(node.url);
    const phUrl = safeHttpUrl(node.url);
    if (!url || !phUrl) return [];
    return [{
    key: `ph:${node.id}`,
    name: node.name,
    url,
    kind: "product" as const,
    description: truncate(`${node.tagline}${node.description ? ` — ${node.description}` : ""}`, 300),
    createdAt: node.createdAt,
    topics: node.topics.edges.map((e) => e.node.name.toLowerCase()),
    signals: [{ source: "producthunt" as const, label: `${node.votesCount} Product Hunt upvotes`, url: phUrl, value: node.votesCount, at: node.createdAt }],
    }];
  });
}

// ---------- templates ----------

function fmtStars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n);
}

function templateBenefit(text: string): string {
  const t = text.toLowerCase();
  if (/\bmcp\b|model context protocol/.test(t)) return "Adds new tools/context to AI assistants (Claude, Cursor, etc.) via MCP.";
  if (/coding|code review|\bide\b|terminal|cli\b|developer/.test(t)) return "Could speed up coding workflows and developer automation.";
  if (/agent/.test(t)) return "Helps you build or run AI agents that automate tasks.";
  if (/\brag\b|retriev|search|embedding|knowledge/.test(t)) return "Helps you build search/RAG on top of your own data.";
  if (/inference|serving|gpu|router|api/.test(t)) return "Alternative inference/API infrastructure that may cut costs.";
  if (/voice|speech|audio|video|image/.test(t)) return "Multimodal (voice/image/video) capabilities you can integrate into products.";
  return "A new AI tool worth evaluating for your needs.";
}

function templatePricing(c: { kind: DiscoverKind; license?: string | null }): string {
  if (c.kind === "github") {
    return c.license ? `Open source (${c.license}) — free to self-host` : "Public code, unclear license — check the repo before use";
  }
  return "Unverified — check the official pricing page";
}

function why(item: Pick<DiscoverItem, "novelty" | "createdAt" | "dateKind" | "stars" | "starsDelta7d" | "signals" | "quote">, now: Date): string {
  const parts: string[] = [];
  const ageDays = item.createdAt ? Math.floor((now.getTime() - Date.parse(item.createdAt)) / 86_400_000) : null;
  if (item.signals.some((s) => s.source === "tip")) parts.push("Editor's pick");
  if (item.dateKind === "spotted" && ageDays != null) parts.push(ageDays <= 1 ? "First spotted today" : `First spotted ${ageDays} days ago`);
  else if (item.novelty === "new" && ageDays != null) parts.push(ageDays <= 1 ? "Just launched" : `${ageDays} days old`);
  if (item.novelty === "trending" && item.createdAt && item.dateKind !== "spotted") parts.push(`Older project (since ${item.createdAt.slice(0, 4)}) gaining momentum`);
  if (item.quote) parts.push(`Buzzing on X (@${item.quote.handle})`);
  const newsletters = [...new Set(item.signals.filter((s) => s.source === "newsletter").map((s) => s.label.replace(/^Featured in /, "")))];
  if (newsletters.length) parts.push(`Featured in ${newsletters.join(", ")}`);
  const hf = item.signals.find((s) => s.source === "huggingface");
  if (hf) parts.push(hf.label);
  if (item.stars) parts.push(`${fmtStars(item.stars)} ⭐ on GitHub`);
  if (item.starsDelta7d && item.starsDelta7d > 0) parts.push(`+${fmtStars(item.starsDelta7d)} ⭐ this week`);
  const hn = item.signals.filter((s) => s.source === "hackernews").sort((a, b) => b.value - a.value)[0];
  if (hn) parts.push(`${hn.value} points on Hacker News`);
  const ph = item.signals.find((s) => s.source === "producthunt");
  if (ph) parts.push(`${ph.value} upvotes on Product Hunt`);
  return `${parts.join(" · ")}.`;
}

function score(item: DiscoverItem): number {
  const stars = Math.log10((item.stars ?? 0) + 1) * 12;
  const delta = Math.log10(Math.max(0, item.starsDelta7d ?? 0) + 1) * 14;
  const hn = Math.max(0, ...item.signals.filter((s) => s.source === "hackernews").map((s) => s.value)) / 12;
  const ph = Math.max(0, ...item.signals.filter((s) => s.source === "producthunt").map((s) => s.value)) / 15;
  const fresh = item.novelty === "new" ? 10 : 0;
  // Social proof from curated channels (each distinct mention counts, capped).
  const buzz = Math.min(30, item.signals.filter((s) => s.source === "x" || s.source === "newsletter").length * 12);
  const hf = Math.min(20, Math.max(0, ...item.signals.filter((s) => s.source === "huggingface").map((s) => s.value)) / 8);
  const tip = item.signals.some((s) => s.source === "tip") ? 35 : 0;
  return Math.round(Math.min(100, stars + delta + hn + ph + fresh + buzz + hf + tip));
}

function mergeSignals(a: Signal[], b: Signal[]): Signal[] {
  const map = new Map<string, Signal>();
  for (const s of [...a, ...b]) {
    const k = `${s.source}:${s.url}`;
    const prev = map.get(k);
    if (!prev || s.at > prev.at) map.set(k, s);
  }
  return [...map.values()].sort((x, y) => y.at.localeCompare(x.at)).slice(0, 6);
}

export interface TipOutcome {
  tip: TipRef;
  ok: boolean;
  name?: string;
  reason?: string;
}

export async function collectDiscover(
  now: Date,
  log: (m: string) => void,
): Promise<{ items: DiscoverItem[]; statuses: SourceStatus[]; tipOutcomes: TipOutcome[]; issues: GhIssue[] }> {
  const nowIso = now.toISOString();
  const file = dataPath("discover.json");
  const existing = readJson<DiscoverItem[]>(file, []);
  const prevStatus = readJson<{ sources?: SourceStatus[] }>(dataPath("status.json"), {}).sources ?? [];
  const statuses: SourceStatus[] = [];
  const candidates: Candidate[] = [];

  const track = async (id: string, name: string, target: string, fn: () => Promise<number | null>) => {
    const prev = prevStatus.find((s) => s.id === id);
    const base = { id, lab: "discover", name, type: "discover" as const, target, lastRunAt: nowIso };
    try {
      const n = await fn();
      if (n === null) {
        statuses.push({ ...base, ok: false, skipped: true, lastSuccessAt: prev?.lastSuccessAt ?? null, lastError: "Not configured (optional — set PRODUCT_HUNT_TOKEN)", fetched: 0, accepted: 0 });
        return;
      }
      statuses.push({ ...base, ok: true, lastSuccessAt: nowIso, lastError: null, fetched: n, accepted: n });
      log(`[discover] ✓ ${id} ${n}`);
    } catch (err) {
      statuses.push({ ...base, ok: false, lastSuccessAt: prev?.lastSuccessAt ?? null, lastError: errorMessage(err), fetched: 0, accepted: 0 });
      log(`[discover] ✗ ${id} ${errorMessage(err)}`);
    }
  };

  await track("github-search", "GitHub Search (new repos)", "api.github.com/search", async () => {
    const c = await githubSearch(now, log);
    candidates.push(...c);
    return c.length;
  });

  let repoRefs = new Map<string, Signal>();
  await track("hackernews", "Hacker News (Algolia)", "hn.algolia.com", async () => {
    const res = await hackerNews(now);
    candidates.push(...res.candidates);
    repoRefs = res.repoRefs;
    return res.candidates.length + res.repoRefs.size;
  });

  // Buzz Radar: tips, newsletters that curate AI Twitter, X posts via oEmbed, HF Spaces, optional X API.
  const existingById = new Map(existing.map((i) => [i.id, i]));
  const buzz = await collectBuzz(now, (key) => existingById.get(shortHash(key)), log);
  statuses.push(...buzz.statuses);
  candidates.push(...buzz.candidates);
  const buzzRepos = new Map<string, { signals: Signal[]; quote?: Candidate["quote"] }>();
  for (const r of buzz.repoSightings) {
    const k = r.fullName.toLowerCase();
    const prev = buzzRepos.get(k);
    buzzRepos.set(k, { signals: [...(prev?.signals ?? []), r.signal], quote: prev?.quote ?? r.quote });
  }

  await track("github-repos", "GitHub repo metadata (HN + buzz + watchlist)", "api.github.com/repos", async () => {
    const names = [...new Set([...[...buzzRepos.keys()], ...DISCOVER.watchlist.map((w) => w.toLowerCase()), ...repoRefs.keys()])];
    const repos = await repoDetails(names, log);
    for (const r of repos) {
      const k = r.full_name.toLowerCase();
      const hnSignal = repoRefs.get(k);
      const extra = buzzRepos.get(k);
      const base: Signal[] = hnSignal ? [hnSignal] : extra ? [] : [{ source: "watchlist", label: "Watchlist", url: r.html_url, value: r.stargazers_count, at: nowIso }];
      const c = fromRepo(r, base[0] ?? extra!.signals[0]);
      candidates.push({ ...c, signals: [...base, ...(extra?.signals ?? [])], ...(extra?.quote ? { quote: extra.quote } : {}) });
    }
    return repos.length;
  });

  await track("producthunt", "Product Hunt API", "api.producthunt.com", async () => {
    const c = await productHunt(now);
    if (c) candidates.push(...c);
    return c ? c.length : null;
  });

  // ---- merge with history ----
  const byKey = new Map<string, DiscoverItem>(existing.map((i) => [i.id, i]));
  const idOf = (key: string) => shortHash(key);
  for (const c of candidates) {
    const id = idOf(c.key);
    const prev = byKey.get(id);
    const history = [...(prev?.starHistory ?? [])];
    if (c.stars != null) {
      const today = nowIso.slice(0, 10);
      const last = history.at(-1);
      if (last && last.at.slice(0, 10) === today) history[history.length - 1] = { at: nowIso, stars: c.stars };
      else history.push({ at: nowIso, stars: c.stars });
    }
    const trimmed = history.slice(-30);
    const weekAgo = daysAgo(now, 7).toISOString();
    // Only a snapshot at least 7 days old gives a real weekly delta; otherwise leave it unknown.
    const baseline = [...trimmed].reverse().find((h) => h.at <= weekAgo);
    const delta = c.stars != null && baseline ? c.stars - baseline.stars : undefined;
    // "spotted" dates are first public sightings: keep the earliest one ever seen.
    const createdAt =
      c.dateKind === "spotted"
        ? [c.createdAt, prev?.createdAt].filter((x): x is string => !!x).sort()[0] ?? null
        : c.createdAt ?? prev?.createdAt ?? null;
    const ageDays = createdAt ? (now.getTime() - Date.parse(createdAt)) / 86_400_000 : null;
    const novelty = ageDays != null && ageDays <= DISCOVER.newWithinDays ? "new" : "trending";
    const text = `${c.name} ${c.description} ${(c.topics ?? []).join(" ")}`;
    const signals = mergeSignals(prev?.signals ?? [], c.signals);
    const draft: DiscoverItem = {
      id,
      name: c.name,
      url: c.url,
      ...(c.repo ? { repo: c.repo } : {}),
      kind: c.kind,
      description: c.description || prev?.description || "",
      summary: prev?.summarySource === "llm" ? prev.summary : c.description || c.name,
      unique: prev?.summarySource === "llm" ? prev.unique : c.topics?.length ? `Topics: ${c.topics.slice(0, 5).join(", ")}` : c.language ? `Written in ${c.language}` : "",
      benefit: prev?.summarySource === "llm" ? prev.benefit : templateBenefit(text),
      why: "",
      pricing: templatePricing(c),
      novelty,
      createdAt,
      ...(c.dateKind ? { dateKind: c.dateKind } : prev?.dateKind ? { dateKind: prev.dateKind } : {}),
      ...(c.quote ?? prev?.quote ? { quote: c.quote ?? prev?.quote } : {}),
      firstSeenAt: prev?.firstSeenAt ?? nowIso,
      lastSeenAt: nowIso,
      ...(c.stars != null ? { stars: c.stars, starHistory: trimmed } : {}),
      ...(delta != null ? { starsDelta7d: delta } : {}),
      language: c.language ?? prev?.language ?? null,
      license: c.license ?? prev?.license ?? null,
      topics: c.topics ?? prev?.topics ?? [],
      signals,
      score: 0,
      summarySource: prev?.summarySource ?? "template",
    };
    // An older project only counts as trending with real momentum (HN/PH signal or star growth).
    if (novelty === "trending") {
      const MOMENTUM_SOURCES = new Set(["hackernews", "producthunt", "watchlist", "x", "newsletter", "tip", "huggingface"]);
      const momentum = (delta ?? 0) >= DISCOVER.github.trendingMinDelta7d || signals.some((s) => MOMENTUM_SOURCES.has(s.source));
      if (!momentum) continue;
    }
    byKey.set(id, draft);
  }

  const keepAfter = daysAgo(now, DISCOVER.keepDays).toISOString();
  const ranked = [...byKey.values()]
    .filter((i) => i.lastSeenAt >= keepAfter)
    .map((i) => {
      const withWhy = { ...i, why: why(i, now) };
      return { ...withWhy, score: score(withWhy) };
    })
    .sort((a, b) => b.score - a.score);
  // Quotas keep the mix diverse: GitHub search is plentiful and would otherwise crowd out the
  // rarer buzz signals (tips, X, newsletters, HF Spaces, Show HN).
  const QUOTA: Partial<Record<DiscoverKind, number>> = { github: DISCOVER.maxItems - 50, "hf-space": 12 };
  const used = new Map<DiscoverKind, number>();
  const items = ranked
    .filter((i) => {
      const n = used.get(i.kind) ?? 0;
      if (n >= (QUOTA[i.kind] ?? Number.POSITIVE_INFINITY)) return false;
      used.set(i.kind, n + 1);
      return true;
    })
    .slice(0, DISCOVER.maxItems);

  // Tip outcomes drive the GitHub issue write-back ("✅ added" / "needs info").
  const tipOutcomes: TipOutcome[] = [];
  const seenTips = new Set<string>();
  const tipKey = (t: TipRef) => String(t.issue ?? t.x ?? t.url);
  for (const r of buzz.tipResults) {
    const tipUrl = r.tip.issueUrl ?? r.tip.x ?? r.tip.url;
    const hit = items.find((i) => i.signals.some((s) => s.source === "tip" && s.url === tipUrl));
    if (seenTips.has(tipKey(r.tip))) continue;
    seenTips.add(tipKey(r.tip));
    tipOutcomes.push(hit ? { tip: r.tip, ok: true, name: hit.name } : { tip: r.tip, ok: false, reason: r.reason });
  }
  for (const t of buzz.tips) {
    if (seenTips.has(tipKey(t))) continue;
    const tipUrl = t.issueUrl ?? t.x ?? t.url;
    const hit = items.find((i) => i.signals.some((s) => s.source === "tip" && s.url === tipUrl));
    seenTips.add(tipKey(t));
    tipOutcomes.push(hit ? { tip: t, ok: true, name: hit.name } : { tip: t, ok: false, reason: "Could not find a product page to publish for this tip" });
  }

  return { items, statuses, tipOutcomes, issues: buzz.issues };
}

export function saveDiscover(items: DiscoverItem[]): boolean {
  return writeJson(dataPath("discover.json"), items);
}

