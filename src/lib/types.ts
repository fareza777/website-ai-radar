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
export type DiscoverKind = "github" | "product" | "show-hn" | "api";

export interface Signal {
  source: "github" | "hackernews" | "producthunt" | "watchlist";
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
  /** Fungsi (what it does). */
  summary: string;
  /** Keunikan. */
  unique: string;
  /** Manfaat praktis. */
  benefit: string;
  /** Alasan layak diperhatikan (signal-based). */
  why: string;
  pricing: string;
  novelty: Novelty;
  /** When the project itself was created/launched (repo created_at, PH launch date) — null if unknown. */
  createdAt: string | null;
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
