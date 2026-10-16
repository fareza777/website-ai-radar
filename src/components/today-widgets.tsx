import Link from "next/link";
import { ArrowUpRight, FileText, Flame, MessageSquare, Newspaper, Radar, TriangleAlert, TrendingUp } from "lucide-react";
import { LAB_BY_SLUG } from "@/config/labs";
import type { LabStat } from "@/lib/data";
import type { PaperItem, PulseItem, SocialPost, StoryCluster, TrendingEntry, Unconfirmed, UpdateItem } from "@/lib/types";
import { extHref } from "@/lib/url";
import { cn } from "@/lib/utils";
import { LabLogo } from "./lab-logo";
import { TimeAgo } from "./time-ago";

/** Shared card shell for dashboard widgets. */
export function Panel({
  title, icon: Icon, href, hint, className, children,
}: { title: string; icon: typeof Flame; href?: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("card-surface dashboard-panel flex min-w-0 flex-col", className)}>
      <div className="panel-heading">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight">
          <Icon className="size-3.5 shrink-0 text-brand" /> {title}
        </h2>
        {href ? (
          <Link href={href} aria-label={`View all: ${title}`} className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground transition hover:text-brand">
            View all <ArrowUpRight className="size-3" />
          </Link>
        ) : hint ? (
          <span className="text-[10px] text-muted-foreground">{hint}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function LabStack({ labs, max = 5 }: { labs: string[]; max?: number }) {
  const shown = labs.slice(0, max);
  return (
    <span className="flex -space-x-1.5">
      {shown.map((slug) => {
        const lab = LAB_BY_SLUG[slug];
        return lab ? <LabLogo key={slug} logo={lab.logo} name={lab.name} size="xs" className="ring-2 ring-card" /> : null;
      })}
      {labs.length > max && <span className="z-10 inline-flex size-5 items-center justify-center rounded-md border bg-surface text-[11px] font-semibold text-muted-foreground">+{labs.length - max}</span>}
    </span>
  );
}

// ───────────────────────── live ticker ─────────────────────────

export function Ticker({ items }: { items: UpdateItem[] }) {
  if (!items.length) return null;
  const row = (suffix: string) =>
    items.map((i) => {
      const lab = LAB_BY_SLUG[i.lab];
      return (
        <a key={`${suffix}-${i.id}`} href={extHref(i.url)} target="_blank" rel="noopener noreferrer" className="group inline-flex shrink-0 items-center gap-2 px-4 text-[12px] text-muted-foreground hover:text-foreground" tabIndex={suffix === "b" ? -1 : 0} aria-hidden={suffix === "b" ? true : undefined}>
          {lab && <LabLogo logo={lab.logo} name={lab.name} size="xs" />}
          <span className="font-medium text-foreground/90">{lab?.name}</span>
          <span className="size-1 shrink-0 rounded-full bg-brand/60" />
          <span className="max-w-[46ch] truncate group-hover:underline">{i.title}</span>
        </a>
      );
    });
  return (
    <div className="card-surface flex items-center overflow-hidden" role="region" aria-label="Latest official updates">
      <span className="z-10 inline-flex shrink-0 items-center gap-2 self-stretch border-r bg-brand/8 px-3 py-2.5 font-mono text-[10px] font-medium uppercase tracking-wider text-brand">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-brand/70" />
          <span className="relative inline-flex size-2 rounded-full bg-brand" />
        </span>
        Latest
      </span>
      <div className="group relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-40px),transparent)]">
        <div className="flex w-max animate-[marquee_160s_linear_infinite] py-2.5 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
          {row("a")}
          {row("b")}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── stories (multi-source clusters) ─────────────────────────

export function StoriesPanel({ stories }: { stories: StoryCluster[] }) {
  if (!stories.length) return null;
  return (
    <Panel title="Stories shaping the week" icon={Newspaper} href="/digest">
      <ul className="grid flex-1 gap-2.5 sm:grid-cols-2">
        {stories.slice(0, 4).map((s, index) => (
          <li key={s.id}>
            <a href={extHref(s.url)} target="_blank" rel="noopener noreferrer" className="group flex h-full flex-col rounded-lg border bg-subtle/25 p-3.5 transition hover:border-brand/40 hover:bg-subtle">
              <span className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span className="font-mono text-muted-foreground/60">0{index + 1}</span>
                {s.entity && <span className="font-medium text-brand">{s.entity}</span>}
                <LabStack labs={s.labs} />
                <TimeAgo iso={s.lastAt} className="ml-auto" />
              </span>
              <span className="my-2.5 line-clamp-2 text-[15px] font-medium leading-snug tracking-tight group-hover:text-brand">{s.title}</span>
              <span className="mt-auto flex flex-wrap gap-x-3 gap-y-0.5 border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
                {s.official > 0 && <span><b className="text-foreground">{s.official}</b> official</span>}
                {s.official === 0 && <span className="rounded bg-amber-500/12 px-1 font-semibold text-amber-700 dark:text-amber-300" title="No official post confirms this yet">media only</span>}
                {s.press > 0 && <span><b className="text-foreground">{s.outlets.length}</b> {s.outlets.length === 1 ? "outlet" : "outlets"}</span>}
                {s.labs.length > 1 && <span><b className="text-foreground">{s.labs.length}</b> labs</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ───────────────────────── trending ─────────────────────────

function Delta({ now, prev }: { now: number; prev: number }) {
  if (prev === 0) return <span className="rounded bg-brand/10 px-1.5 py-0.5 font-mono text-[9px] font-medium text-brand">NEW</span>;
  const pct = Math.round(((now - prev) / prev) * 100);
  return <span className={cn("font-mono text-[10px] font-medium tabular-nums", pct >= 0 ? "text-brand" : "text-rose-700 dark:text-rose-400")}>{pct >= 0 ? "+" : "−"}{Math.abs(pct)}%</span>;
}

export function TrendingPanel({ entities }: { entities: TrendingEntry[] }) {
  if (!entities.length) return null;
  return (
    <Panel title="Trending names" icon={TrendingUp} hint="mentions · 7d">
      <ul className="space-y-2.5">
        {entities.slice(0, 4).map((e) => (
          <li key={e.name}>
            <Link href={`/firehose?q=${encodeURIComponent(e.name)}`} className="group flex items-center gap-2.5">
              <LabStack labs={e.labs} max={3} />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium group-hover:text-brand">{e.name}</span>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{e.count}</span>
              <Delta now={e.count} prev={e.prev} />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function TopicsPanel({ topics }: { topics: TrendingEntry[] }) {
  if (!topics.length) return null;
  const max = Math.max(1, ...topics.map((t) => t.count));
  return (
    <Panel title="Trending topics" icon={Flame} href="/firehose">
      <ul className="space-y-2">
        {topics.slice(0, 4).map((t) => (
          <li key={t.name} className="flex items-center gap-2 text-[12px]">
            <span className="w-20 truncate font-medium">{t.name}</span>
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-brand/80" style={{ width: `${(t.count / max) * 100}%` }} />
            </span>
            <span className="w-5 text-right font-mono text-[10px] tabular-nums text-muted-foreground">{t.count}</span>
            <Delta now={t.count} prev={t.prev} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function LabActivityPanel({ stats }: { stats: LabStat[] }) {
  const rows = [...stats].sort((a, b) => b.last7 - a.last7).slice(0, 6);
  const max = Math.max(1, ...rows.map((s) => s.last7));
  return (
    <Panel title="Most active labs" icon={Radar} href="/labs" hint="7d">
      <ul className="space-y-2.5">
        {rows.map((s) => {
          const lab = LAB_BY_SLUG[s.slug];
          return (
            <li key={s.slug}>
              <Link href={`/labs/${s.slug}`} className="group flex items-center gap-2.5">
                <LabLogo logo={lab.logo} name={lab.name} size="xs" />
                <span className="w-24 truncate text-[12px] font-medium group-hover:text-brand">{lab.name}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-brand/80" style={{ width: `${(s.last7 / max) * 100}%` }} />
                </span>
                <span className="w-6 text-right text-[13px] tabular-nums text-muted-foreground">{s.last7}</span>
                {s.press7 > 0 && <span title="Media reports in 7 days" className="inline-flex w-8 items-center justify-end gap-1 text-[10px] tabular-nums text-muted-foreground/80"><Newspaper className="size-2.5" />{s.press7}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ───────────────────────── safety net: unconfirmed reports ─────────────────────────

export function UnconfirmedPanel({ items }: { items: Unconfirmed[] }) {
  if (!items.length) return null;
  return (
    <Panel title="Reported, not yet official" icon={TriangleAlert} href="/firehose?s=press" className="border-amber-500/30">
      <p className="mb-3 text-[13px] leading-snug text-muted-foreground">
        Multiple outlets report these, but no matching post exists in the lab&rsquo;s official feeds yet. <b className="text-foreground">Treat as unverified.</b>
      </p>
      <ul className="space-y-3">
        {items.slice(0, 5).map((u) => {
          const lab = LAB_BY_SLUG[u.lab];
          return (
            <li key={u.id}>
              <a href={extHref(u.url)} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2.5">
                {lab && <LabLogo logo={lab.logo} name={lab.name} size="xs" className="mt-0.5" />}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-[14px] font-medium leading-snug group-hover:underline">{u.title}</span>
                  <span className="text-[12.5px] text-muted-foreground">
                    {u.outlets.slice(0, 2).join(", ")}
                    {u.outlets.length > 2 ? ` +${u.outlets.length - 2}` : ""} · <TimeAgo iso={u.at} />
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ───────────────────────── papers & community ─────────────────────────

export function PapersPanel({ papers }: { papers: PaperItem[] }) {
  if (!papers.length) return null;
  return (
    <Panel title="Research radar" icon={FileText} href="/firehose?s=paper" hint="lab papers · HF daily">
      <ul className="space-y-3">
        {papers.slice(0, 5).map((p) => {
          const lab = p.lab ? LAB_BY_SLUG[p.lab] : undefined;
          return (
            <li key={p.id}>
              <a href={extHref(p.url)} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2.5">
                {lab ? <LabLogo logo={lab.logo} name={lab.name} size="xs" className="mt-0.5" /> : <span className="size-5" />}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-[14px] font-medium leading-snug group-hover:underline">{p.title}</span>
                  <span className="text-[12.5px] text-muted-foreground">
                    {lab?.name ?? p.org ?? "Paper"} · ▲ {p.upvotes}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function PulsePanel({ items }: { items: PulseItem[] }) {
  if (!items.length) return null;
  return (
    <Panel title="Community pulse" icon={MessageSquare} href="/firehose?s=community" hint="Hacker News · 72h">
      <ul className="space-y-3">
        {items.slice(0, 6).map((c) => {
          const lab = c.lab ? LAB_BY_SLUG[c.lab] : undefined;
          return (
            <li key={c.id} className="flex items-start gap-2.5">
              <span className="mt-0.5 w-11 shrink-0 rounded-md bg-orange-500/10 py-0.5 text-center text-[12.5px] font-semibold tabular-nums text-orange-600 dark:text-orange-300">{c.points}</span>
              <span className="min-w-0 flex-1">
                <a href={extHref(c.url)} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-[14px] font-medium leading-snug hover:underline">{c.title}</a>
                <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                  {lab && <LabLogo logo={lab.logo} name={lab.name} size="xs" className="size-4 [&>span]:size-3" />}
                  <a href={extHref(c.hnUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                    {c.comments} comments <ArrowUpRight className="size-3" />
                  </a>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ───────────────────────── social wire (X + Threads) ─────────────────────────

const PLATFORM_GLYPH = { x: "𝕏", threads: "@" } as const;

export function SocialPanel({ posts, official }: { posts: SocialPost[]; official: number }) {
  const shown = [...posts].sort((a, b) => Number(b.official) - Number(a.official) || b.at.localeCompare(a.at)).slice(0, 6);
  return (
    <Panel title="Social wire" icon={MessageSquare} href="/firehose?s=social" hint={`X + Threads · ${official} official`}>
      {shown.length === 0 ? (
        <p className="text-[13.5px] leading-snug text-muted-foreground">
          No X/Threads posts captured in the last 7 days. Posts arrive via newsletters, tips, and — when configured — the official X and Threads APIs (see <Link href="/status" className="underline">Status</Link>).
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((p) => {
            const lab = p.lab ? LAB_BY_SLUG[p.lab] : undefined;
            return (
              <li key={p.id}>
                <a href={extHref(p.url)} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2.5">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-[12px] font-bold text-background">{PLATFORM_GLYPH[p.platform]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      {lab && <LabLogo logo={lab.logo} name={lab.name} size="xs" className="size-4 [&>span]:size-3" />}
                      <span className="truncate font-medium text-foreground">{p.author}</span>
                      <span className="truncate">@{p.handle}</span>
                      {p.official && <span className="rounded bg-brand/10 px-1 font-semibold text-brand">official</span>}
                      <TimeAgo iso={p.at} className="ml-auto shrink-0" />
                    </span>
                    <span className="mt-1 line-clamp-3 block text-[12px] leading-relaxed group-hover:underline">
                      {p.text || `Post on ${p.platform === "x" ? "X" : "Threads"} — open to read`}
                    </span>
                    {p.likes ? <span className="text-[12.5px] text-muted-foreground">♥ {p.likes.toLocaleString("en-US")}</span> : null}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
