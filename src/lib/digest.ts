import type { Deal, DiscoverItem, PaperItem, PriceMove, PulseItem, SocialPost, StartupNews, StoriesFile, UpdateItem } from "./types";

export interface DigestEntry {
  title: string;
  url: string;
  /** Short context line (lab, source, numbers) — facts only. */
  meta?: string;
}

export interface DigestSection {
  id: string;
  title: string;
  note?: string;
  entries: DigestEntry[];
}

export interface Digest {
  fromIso: string;
  toIso: string;
  sections: DigestSection[];
}

export interface DigestInput {
  now: number;
  days?: number;
  official: readonly UpdateItem[];
  stories: StoriesFile;
  discover: readonly DiscoverItem[];
  startups: readonly StartupNews[];
  papers: readonly PaperItem[];
  social: readonly SocialPost[];
  pulse: readonly PulseItem[];
  moves: readonly PriceMove[];
  deals: readonly Deal[];
  labName: (slug: string) => string;
}

const DAY = 86_400_000;
const usd = (n: number) => (n === 0 ? "free" : `$${n < 1 ? n.toFixed(3) : n.toFixed(2)}`);

export function buildDigest(i: DigestInput): Digest {
  const days = i.days ?? 7;
  const since = i.now - days * DAY;
  const recent = <T extends { at: string }>(rows: readonly T[]) => rows.filter((r) => Date.parse(r.at) >= since && Date.parse(r.at) <= i.now + 6 * 3_600_000);
  const official = i.official.filter((o) => Date.parse(o.publishedAt) >= since);
  const lab = i.labName;

  const sections: DigestSection[] = [
    {
      id: "stories",
      title: "Top stories",
      note: "Events reported by several labs or outlets, grouped into one story.",
      entries: i.stories.stories
        .filter((s) => Date.parse(s.lastAt) >= since)
        .slice(0, 8)
        .map((s) => ({
          title: s.entity ? `${s.entity} — ${s.title}` : s.title,
          url: s.url,
          meta: [s.labs.map(lab).join(", "), s.official ? `${s.official} official` : "", s.outlets.length ? `${s.outlets.length} outlets` : ""].filter(Boolean).join(" · "),
        })),
    },
    {
      id: "models",
      title: "Model releases",
      entries: official
        .filter((o) => o.category === "model" && o.sourceType !== "github-releases")
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 12)
        .map((o) => ({ title: o.title, url: o.url, meta: `${lab(o.lab)} · ${o.sourceName}` })),
    },
    {
      id: "pricing",
      title: "Pricing, promos & deals",
      entries: [
        ...official.filter((o) => o.category === "pricing" || o.category === "promo").slice(0, 5).map((o) => ({ title: o.title, url: o.url, meta: `${lab(o.lab)} · ${o.category}` })),
        ...i.moves
          .filter((m) => Date.parse(m.at) >= since)
          .slice(0, 6)
          .map((m) => ({ title: `${m.name}: ${m.field} price ${usd(m.from)} → ${usd(m.to)} per 1M tokens (${m.change > 0 ? "+" : ""}${m.change}%)`, url: `https://openrouter.ai/${m.modelId}`, meta: "price move" })),
        ...i.deals.filter((d) => d.status === "active").slice(0, 4).map((d) => ({ title: d.title, url: d.url, meta: `${d.provider} · verified active` })),
      ],
    },
    {
      id: "tools",
      title: "New tools & startups",
      entries: [
        ...i.discover
          .filter((d) => d.novelty === "new")
          .sort((a, b) => b.score - a.score)
          .slice(0, 6)
          .map((d) => ({ title: d.name, url: d.url, meta: d.why })),
        ...i.startups.filter((s) => Date.parse(s.publishedAt) >= since && s.kind === "funding").slice(0, 5).map((s) => ({ title: s.title, url: s.url, meta: `${s.source}${s.amount ? ` · ${s.amount}` : ""}` })),
      ],
    },
    {
      id: "research",
      title: "Research",
      entries: i.papers
        .filter((p) => p.lab && Date.parse(p.submittedAt) >= since)
        .sort((a, b) => b.upvotes - a.upvotes)
        .slice(0, 6)
        .map((p) => ({ title: p.title, url: p.url, meta: `${lab(p.lab!)} · ▲ ${p.upvotes}` })),
    },
    {
      id: "social",
      title: "Social & community",
      entries: [
        ...recent(i.social.map((s) => ({ ...s })))
          .filter((s) => s.official)
          .slice(0, 5)
          .map((s) => ({ title: s.text || `Post by @${s.handle}`, url: s.url, meta: `@${s.handle} on ${s.platform === "x" ? "X" : "Threads"}` })),
        ...recent(i.pulse.map((p) => ({ ...p })))
          .sort((a, b) => b.points - a.points)
          .slice(0, 5)
          .map((p) => ({ title: p.title, url: p.url, meta: `Hacker News · ${p.points} points` })),
      ],
    },
    {
      id: "unconfirmed",
      title: "Reported, not yet official",
      note: "Media reports with no matching post in official feeds. Treat as unverified.",
      entries: i.stories.unconfirmed.slice(0, 6).map((u) => ({ title: u.title, url: u.url, meta: `${lab(u.lab)} · ${u.outlets.slice(0, 3).join(", ")}` })),
    },
  ];

  return { fromIso: new Date(since).toISOString(), toIso: new Date(i.now).toISOString(), sections: sections.filter((s) => s.entries.length > 0) };
}

const day = (iso: string) => iso.slice(0, 10);

export function digestMarkdown(d: Digest): string {
  const lines = [`# AI Radar weekly digest (${day(d.fromIso)} → ${day(d.toIso)})`, ""];
  for (const s of d.sections) {
    lines.push(`## ${s.title}`);
    if (s.note) lines.push(`_${s.note}_`);
    for (const e of s.entries) lines.push(`- [${e.title.replace(/[[\]]/g, "")}](${e.url})${e.meta ? ` — ${e.meta}` : ""}`);
    lines.push("");
  }
  lines.push("Generated by AI Radar from official sources, press reports, and community signals.");
  return lines.join("\n");
}
