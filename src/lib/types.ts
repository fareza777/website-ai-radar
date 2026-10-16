// Shared data contracts between the collector (scripts/) and the website (src/app).
// Everything in data/*.json conforms to these types.

export const CATEGORIES = ["model", "feature", "api", "pricing", "promo", "research", "developer"] as const;
export type Category = (typeof CATEGORIES)[number];

export type SourceType = "rss" | "huggingface" | "github-releases" | "github-new-repos";

/** official = feed/org owned by the lab. mirror = community mirror of an official page (links still point to the lab). */
export type Trust = "official" | "mirror";

export interface SourceConfig {
  id: string;
  type: SourceType;
  name: string;
  /** RSS/Atom URL, HF author, "owner/repo", or GitHub user/org depending on type. */
  target: string;
  trust: Trust;
  /** Case-insensitive regex; item kept only if title+excerpt matches. */
  include?: string;
  /** Case-insensitive regex; item dropped if title+excerpt matches. */
  exclude?: string;
  /** huggingface: minimum likes for a model to be listed (filters noise from huge orgs). */
  minLikes?: number;
  /** Max items accepted from this source per run. */
  limit?: number;
  /** Display name for releases (e.g. "Claude Code"). */
  label?: string;
}

export type Coverage = "full" | "partial" | "mirror";

export interface LabConfig {
  slug: string;
  name: string;
  /** Short org/product line shown under the name. */
  tagline: string;
  website: string;
  /** Hostnames treated as official for link verification. */
  domains: string[];
  /** Brand accent (hex) used for subtle glows. */
  color: string;
  logo: string;
  coverage: Coverage;
  coverageNote: string;
  sources: SourceConfig[];
}

export interface SeenIn {
  sourceId: string;
  sourceName: string;
  url: string;
}

export interface UpdateItem {
  id: string;
  lab: string;
  title: string;
  url: string;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  trust: Trust;
  /** True when the link host belongs to the lab's official domains (or its GitHub/HF org). */
  verified: boolean;
  publishedAt: string;
  firstSeenAt: string;
  /** Last time content (title/excerpt) changed at the source. */
  updatedAt: string;
  excerpt: string;
  summary: string;
  benefit: string;
  summarySource: "template" | "llm";
  category: Category;
  tags: string[];
  importance: number;
  contentHash: string;
  seenIn?: SeenIn[];
  meta?: Record<string, string | number>;
}

export interface SourceStatus {
  id: string;
  lab: string;
  name: string;
  type: SourceType | "discover" | "deals";
  target: string;
  ok: boolean;
  /** Optional source intentionally not configured (e.g. missing API token) — not a failure. */
  skipped?: boolean;
  lastRunAt: string;
  lastSuccessAt: string | null;
  lastError: string | null;
  fetched: number;
  accepted: number;
}

export interface RunStatus {
  generatedAt: string;
  durationMs: number;
  llm: { enabled: boolean; model: string | null; summarized: number };
  sources: SourceStatus[];
}

export type Novelty = "new" | "trending";
export type DiscoverKind = "github" | "product" | "show-hn" | "api" | "x" | "newsletter" | "tip" | "hf-space";

export interface Signal {
  source: "github" | "hackernews" | "producthunt" | "watchlist" | "x" | "newsletter" | "tip" | "huggingface";
  label: string;
  url: string;
  value: number;
  at: string;
}

export interface DiscoverItem {
  id: string;
  name: string;
  url: string;
  repo?: string;
  kind: DiscoverKind;
  description: string;
  /** What it does. */
  summary: string;
  /** What makes it unique. */
  unique: string;
  /** Practical benefit. */
  benefit: string;
  /** Why it is worth watching (signal-based). */
  why: string;
  pricing: string;
  novelty: Novelty;
  /** When the project itself was created/launched (repo created_at, PH launch date) — null if unknown. */
  createdAt: string | null;
  /** "spotted" = createdAt is the first public sighting (websites have no reliable creation date). */
  dateKind?: "created" | "spotted";
  firstSeenAt: string;
  lastSeenAt: string;
  stars?: number;
  starHistory?: { at: string; stars: number }[];
  starsDelta7d?: number;
  language?: string | null;
  license?: string | null;
  topics?: string[];
  signals: Signal[];
  score: number;
  summarySource: "template" | "llm";
  /** Post on X that surfaced this item (read via the official oEmbed endpoint). */
  quote?: XQuote;
}

export interface XQuote {
  text: string;
  author: string;
  handle: string;
  url: string;
  date: string | null;
}

export type StartupEventKind = "funding" | "launch" | "acquisition" | "other";

export interface StartupNews {
  id: string;
  title: string;
  company: string | null;
  kind: StartupEventKind;
  /** Amount exactly as written in the headline, e.g. "$2.4M" — never computed. */
  amount: string | null;
  url: string;
  source: string;
  publishedAt: string;
  firstSeenAt: string;
}

export interface ModelPrice {
  at: string;
  prompt: number;
  completion: number;
}

export interface ModelEntry {
  id: string;
  name: string;
  vendor: string;
  lab?: string;
  contextLength: number | null;
  /** USD per 1M tokens. */
  prompt: number;
  completion: number;
  free: boolean;
  modalities: string[];
  createdAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  history: ModelPrice[];
  /** Last price confirmed over several consecutive snapshots (what `prompt`/`completion` show). */
  stable?: { prompt: number; completion: number; since: string };
  /** A different price seen in the latest snapshots, awaiting confirmation. */
  pending?: { prompt: number; completion: number; runs: number };
}

export interface PriceMove {
  id: string;
  modelId: string;
  name: string;
  lab?: string;
  at: string;
  field: "prompt" | "completion";
  from: number;
  to: number;
  /** Percent change, rounded to 1 decimal. */
  change: number;
}

export type DealStatus = "active" | "announced" | "unverified" | "expired";
export type DealKind = "free-model" | "free-tier" | "credits" | "discount" | "trial" | "promo";

export interface Deal {
  id: string;
  title: string;
  provider: string;
  kind: DealKind;
  description: string;
  terms: string;
  url: string;
  sourceName: string;
  status: DealStatus;
  startsAt: string | null;
  endsAt: string | null;
  firstSeenAt: string;
  lastVerifiedAt: string | null;
  /** Text snippet copied from the official page that proves the offer (auto-extracted). */
  evidence?: string;
  lab?: string;
  meta?: Record<string, string | number>;
}

export interface Briefing {
  date: string;
  generatedAt: string;
  source: "template" | "llm";
  headline: string;
  bullets: { text: string; itemId?: string; lab?: string }[];
  stats: { updates24h: number; labsActive24h: number; updates7d: number; newModels7d: number };
}

// ───────────────────────── Signal streams beyond official lab feeds ─────────────────────────

/** A media report about a lab (Google News). Never treated as official or verified. */
export interface PressItem {
  id: string;
  lab: string;
  title: string;
  url: string;
  outlet: string;
  publishedAt: string;
  firstSeenAt: string;
  /** Distinct outlets that reported the same story (this item is the earliest/representative). */
  reports: number;
  outlets: string[];
  /** Hashes of the article URLs merged into this cluster (prevents double counting across runs). */
  members: string[];
}

export interface PaperItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  publishedAt: string;
  submittedAt: string;
  upvotes: number;
  /** Hugging Face organization slug when the paper is attributed to one. */
  org: string | null;
  /** Tracked lab the organization maps to. */
  lab?: string;
  githubRepo?: string;
  firstSeenAt: string;
}

export interface PulseItem {
  id: string;
  title: string;
  /** Linked article/product URL (falls back to the HN thread). */
  url: string;
  hnUrl: string;
  points: number;
  comments: number;
  at: string;
  lab?: string;
  firstSeenAt: string;
}

export interface StoryCluster {
  id: string;
  title: string;
  entity: string | null;
  labs: string[];
  official: number;
  press: number;
  outlets: string[];
  firstAt: string;
  lastAt: string;
  /** Link to the most authoritative member (official item when present). */
  url: string;
  lead: { kind: "official" | "press"; id: string };
  importance: number;
}

export interface TrendingEntry {
  name: string;
  count: number;
  prev: number;
  labs: string[];
}

export interface Unconfirmed {
  id: string;
  lab: string;
  title: string;
  url: string;
  outlets: string[];
  reports: number;
  at: string;
}

export interface StoriesFile {
  generatedAt: string;
  stories: StoryCluster[];
  trending: { entities: TrendingEntry[]; topics: TrendingEntry[] };
  unconfirmed: Unconfirmed[];
}

export type SignalStream = "official" | "press" | "paper" | "community" | "social";

/** A post on X or Threads. Only obtained through official access (oEmbed, X API, Threads API, user/agent tips). */
export interface SocialPost {
  /** `${platform}:${postId}` */
  id: string;
  platform: "x" | "threads";
  handle: string;
  author: string;
  /** Tracked lab when the handle is one of its official accounts. */
  lab?: string;
  /** Post text; empty for link-only entries (e.g. a Threads URL submitted without API access). */
  text: string;
  url: string;
  /** Post time when known, otherwise the time it was first seen. */
  at: string;
  exactTime: boolean;
  likes?: number;
  reposts?: number;
  replies?: number;
  links: string[];
  via: "newsletter" | "tip" | "x-api" | "threads-api";
  official: boolean;
  firstSeenAt: string;
}

/** Compact row for the Firehose table (keys kept short — the payload is fetched client-side). */
export interface FirehoseRow {
  i: string;
  /** stream */
  s: SignalStream;
  /** lab slug ("" when none) */
  l: string;
  /** title */
  t: string;
  u: string;
  /** published ISO */
  a: string;
  /** category (official only) */
  c?: string;
  /** source / outlet / org label */
  w: string;
  /** importance / upvotes / points */
  m: number;
  /** verified official link */
  v?: 1;
  /** extra: reports count (press), comments (community) */
  x?: number;
}
