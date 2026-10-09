import type { SourceConfig } from "../../src/lib/types";
import { isPrerelease, semverKind } from "./classify";
import { parseFeed } from "./feed";
import { fetchJson, fetchText } from "./http";
import { decodeEntities, parseDate, safeRegex, stripHtml, truncate } from "./text";

/** Source-agnostic item before classification/merging. */
export interface RawItem {
  title: string;
  url: string;
  publishedAt: Date;
  excerpt: string;
  meta?: Record<string, string | number>;
}

export interface SourceResult {
  fetched: number;
  items: RawItem[];
}

export interface FetchContext {
  now: Date;
  /** Items older than this are ignored (backfill window). */
  since: Date;
}

const EXCERPT_MAX = 420;
// Bad source data guard: allow small clock skew but never accept far-future dates.
const MAX_FUTURE_MS = 2 * 86_400_000;

function accept(source: SourceConfig, ctx: FetchContext, item: RawItem): boolean {
  const t = item.publishedAt.getTime();
  if (t < ctx.since.getTime() || t > ctx.now.getTime() + MAX_FUTURE_MS) return false;
  const hay = `${item.title} ${item.excerpt}`;
  const include = safeRegex(source.include);
  const exclude = safeRegex(source.exclude);
  if (include && !include.test(hay)) return false;
  if (exclude && exclude.test(source.type === "huggingface" ? item.title : hay)) return false;
  return true;
}

function finish(source: SourceConfig, ctx: FetchContext, all: RawItem[]): SourceResult {
  const items = all
    .filter((i) => i.title && i.url && accept(source, ctx, i))
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, source.limit ?? 60);
  return { fetched: all.length, items };
}

async function fromRss(source: SourceConfig, ctx: FetchContext): Promise<SourceResult> {
  const xml = await fetchText(source.target);
  const entries = parseFeed(xml);
  const items: RawItem[] = [];
  for (const e of entries) {
    const publishedAt = e.publishedAt ?? e.updatedAt;
    if (!publishedAt) continue; // no reliable date → skip instead of guessing
    items.push({
      title: e.title,
      url: decodeEntities(e.url.trim()),
      publishedAt,
      excerpt: truncate(stripHtml(e.html), EXCERPT_MAX),
    });
  }
  return finish(source, ctx, items);
}

interface HfModel {
  id: string;
  likes?: number;
  downloads?: number;
  pipeline_tag?: string;
  tags?: string[];
  createdAt?: string;
  private?: boolean;
}

async function fromHuggingFace(source: SourceConfig, ctx: FetchContext): Promise<SourceResult> {
  const url = `https://huggingface.co/api/models?author=${encodeURIComponent(source.target)}&sort=createdAt&direction=-1&limit=100`;
  const models = await fetchJson<HfModel[]>(url);
  const minLikes = source.minLikes ?? 0;
  const items: RawItem[] = [];
  for (const m of models) {
    const created = parseDate(m.createdAt);
    if (!created || m.private) continue;
    if ((m.likes ?? 0) < minLikes) continue;
    const name = m.id.split("/").slice(1).join("/") || m.id;
    const license = m.tags?.find((t) => t.startsWith("license:"))?.slice("license:".length);
    const meta: Record<string, string | number> = { likes: m.likes ?? 0, downloads: m.downloads ?? 0, repo: m.id };
    if (m.pipeline_tag) meta.pipeline = m.pipeline_tag;
    if (license) meta.license = license;
    items.push({
      title: name,
      url: `https://huggingface.co/${m.id}`,
      publishedAt: created,
      excerpt: [m.pipeline_tag, license && `license: ${license}`, `${m.likes ?? 0} likes`, `${m.downloads ?? 0} downloads`]
        .filter(Boolean)
        .join(" · "),
      meta,
    });
  }
  return finish(source, ctx, items);
}

function prettyRepo(repo: string): string {
  const name = repo.split("/")[1] ?? repo;
  return name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fromGithubReleases(source: SourceConfig, ctx: FetchContext): Promise<SourceResult> {
  const xml = await fetchText(`https://github.com/${source.target}/releases.atom`);
  const entries = parseFeed(xml);
  const label = source.label ?? prettyRepo(source.target);
  const items: RawItem[] = [];
  for (const e of entries) {
    const version = e.title.trim();
    if (!e.publishedAt && !e.updatedAt) continue;
    if (isPrerelease(version) || isPrerelease(e.url)) continue;
    const kind = semverKind(version) ?? semverKind(e.url);
    const ver = /v?\d+\.\d+(\.\d+)?/.exec(version)?.[0] ?? version;
    items.push({
      title: `${label} ${ver.startsWith("v") ? ver : `v${ver}`}`,
      url: decodeEntities(e.url),
      publishedAt: (e.updatedAt ?? e.publishedAt)!,
      excerpt: truncate(stripHtml(e.html), EXCERPT_MAX),
      meta: { version: ver, semver: kind ?? "unknown", repo: source.target },
    });
  }
  return finish(source, ctx, items);
}

interface GhRepo {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  created_at: string;
  fork: boolean;
  archived: boolean;
  stargazers_count: number;
  language: string | null;
}

async function fromGithubNewRepos(source: SourceConfig, ctx: FetchContext): Promise<SourceResult> {
  const repos = await fetchJson<GhRepo[]>(
    `https://api.github.com/users/${encodeURIComponent(source.target)}/repos?sort=created&direction=desc&per_page=15`,
  );
  const items: RawItem[] = [];
  for (const r of repos) {
    const created = parseDate(r.created_at);
    if (!created || r.fork || r.archived) continue;
    items.push({
      title: r.name,
      url: r.html_url,
      publishedAt: created,
      excerpt: truncate(r.description ?? "", EXCERPT_MAX),
      meta: { stars: r.stargazers_count, repo: r.full_name, ...(r.language ? { language: r.language } : {}) },
    });
  }
  return finish(source, ctx, items);
}

export async function fetchSource(source: SourceConfig, ctx: FetchContext): Promise<SourceResult> {
  switch (source.type) {
    case "rss":
      return fromRss(source, ctx);
    case "huggingface":
      return fromHuggingFace(source, ctx);
    case "github-releases":
      return fromGithubReleases(source, ctx);
    case "github-new-repos":
      return fromGithubNewRepos(source, ctx);
  }
}
