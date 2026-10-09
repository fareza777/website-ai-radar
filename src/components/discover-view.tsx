"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Search, Sparkles, Star, TrendingUp } from "lucide-react";
import { useDebounced } from "@/hooks/use-debounced";
import { DISCOVER_KIND_LABEL } from "@/lib/categories";
import { compactNumber, formatDate } from "@/lib/format";
import type { DiscoverItem, DiscoverKind, Novelty } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BookmarkButton } from "./bookmark-button";
import { Chip, ChipRow, EmptyState, Pagination, SearchInput, Segmented } from "./filters";
import { GithubIcon } from "./lab-logo";
import { extHref } from "@/lib/url";

type Sort = "score" | "newest" | "stars";
const PER_PAGE = 18;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-lg bg-subtle/70 px-3 py-2">
      <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[13px] leading-snug text-foreground/85">{children}</dd>
    </div>
  );
}

function DiscoverCard({ item }: { item: DiscoverItem }) {
  const isNew = item.novelty === "new";
  const repoUrl = item.repo ? `https://github.com/${item.repo}` : null;
  const hn = item.signals.find((s) => s.source === "hackernews");
  return (
    <article className="lab-glow card-surface flex h-full flex-col p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold",
                isNew ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-orange-500/12 text-orange-700 dark:text-orange-300",
              )}
              title={isNew ? "A genuinely new project/product launch" : "An older project that is trending again"}
            >
              {isNew ? <Sparkles className="size-3" /> : <TrendingUp className="size-3" />}
              {isNew ? "Brand new" : "Older · trending"}
            </span>
            <span className="inline-flex h-5 items-center rounded-md border px-1.5 text-[11px] text-muted-foreground">{DISCOVER_KIND_LABEL[item.kind]}</span>
            {item.summarySource === "llm" && <span className="rounded bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">AI</span>}
          </div>
          <h3 className="mt-2 text-base font-semibold tracking-tight">
            <a href={extHref(item.url)} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {item.name}
            </a>
          </h3>
          {item.repo && <p className="truncate font-mono text-[11.5px] text-muted-foreground">{item.repo}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-lg bg-brand/10 px-2 py-1 text-xs font-semibold tabular-nums text-brand" title="Signal score (stars, momentum, HN, Product Hunt)">
            {item.score}
          </span>
          <BookmarkButton entry={{ id: item.id, kind: "discover", title: item.name, url: item.url, subtitle: item.summary, date: item.createdAt ?? item.firstSeenAt }} />
        </div>
      </header>

      {item.description && item.description !== item.summary && <p className="mt-2 line-clamp-2 text-[13px] text-muted-foreground">{item.description}</p>}

      <dl className="mt-3 grid gap-2">
        <Fact label="What it does">{item.summary}</Fact>
        <Fact label="What's unique">{item.unique}</Fact>
        <Fact label="Why it helps">{item.benefit}</Fact>
        <Fact label="Pricing">{item.pricing}</Fact>
      </dl>

      <p className="mt-3 text-[12.5px] font-medium text-brand">
        <span className="text-muted-foreground">Why it&rsquo;s on the radar: </span>
        {item.why}
      </p>

      <footer className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 text-[11.5px] text-muted-foreground">
        {item.stars != null && (
          <span className="inline-flex items-center gap-1">
            <Star className="size-3" /> {compactNumber(item.stars)}
          </span>
        )}
        {item.language && <span>{item.language}</span>}
        {item.license && <span className="font-mono">{item.license}</span>}
        {item.createdAt && <span>created {formatDate(item.createdAt)}</span>}
        <span className="ml-auto flex items-center gap-2">
          {repoUrl && repoUrl !== item.url && (
            <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground" aria-label="GitHub repo">
              <GithubIcon className="size-3.5" />
            </a>
          )}
          {hn && (
            <a href={extHref(hn.url)} target="_blank" rel="noopener noreferrer" className="font-semibold text-orange-600 hover:underline dark:text-orange-400">
              HN
            </a>
          )}
          <a href={extHref(item.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-foreground hover:underline">
            Official link <ArrowUpRight className="size-3.5" />
          </a>
        </span>
      </footer>
    </article>
  );
}

export function DiscoverView({ items }: { items: DiscoverItem[] }) {
  const [novelty, setNovelty] = useState<Novelty | "all">("all");
  const [kind, setKind] = useState<DiscoverKind | "all">("all");
  const [sort, setSort] = useState<Sort>("score");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(query.trim().toLowerCase());

  const kinds = useMemo(() => [...new Set(items.map((i) => i.kind))], [items]);
  const filtered = useMemo(() => {
    const list = items.filter(
      (i) =>
        (novelty === "all" || i.novelty === novelty) &&
        (kind === "all" || i.kind === kind) &&
        (!q || `${i.name} ${i.description} ${i.summary} ${(i.topics ?? []).join(" ")}`.toLowerCase().includes(q)),
    );
    if (sort === "newest") return [...list].sort((a, b) => (b.createdAt ?? b.firstSeenAt).localeCompare(a.createdAt ?? a.firstSeenAt));
    if (sort === "stars") return [...list].sort((a, b) => (b.stars ?? -1) - (a.stars ?? -1));
    return list;
  }, [items, novelty, kind, q, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const count = (n: Novelty) => items.filter((i) => i.novelty === n).length;

  return (
    <div className="space-y-4">
      <div className="card-surface space-y-3 p-3 sm:p-4">
        <ChipRow>
          <Chip active={novelty === "all"} onClick={() => { setNovelty("all"); setPage(1); }} count={items.length}>All</Chip>
          <Chip active={novelty === "new"} onClick={() => { setNovelty("new"); setPage(1); }} count={count("new")}>✨ Brand new</Chip>
          <Chip active={novelty === "trending"} onClick={() => { setNovelty("trending"); setPage(1); }} count={count("trending")}>📈 Older but trending</Chip>
          <span className="mx-1 w-px shrink-0 self-stretch bg-border" />
          <Chip active={kind === "all"} onClick={() => { setKind("all"); setPage(1); }}>All sources</Chip>
          {kinds.map((k) => (
            <Chip key={k} active={kind === k} onClick={() => { setKind(k); setPage(1); }} count={items.filter((i) => i.kind === k).length}>
              {DISCOVER_KIND_LABEL[k]}
            </Chip>
          ))}
        </ChipRow>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search tools, agents, MCP, coding…" className="flex-1" />
          <Segmented<Sort>
            ariaLabel="Sort"
            value={sort}
            onChange={(v) => { setSort(v); setPage(1); }}
            options={[{ value: "score", label: "Score" }, { value: "newest", label: "Newest" }, { value: "stars", label: "Stars" }]}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<Search className="size-6" />} title="No results">Try another keyword or clear filters.</EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((i) => (
            <li key={i.id}>
              <DiscoverCard item={i} />
            </li>
          ))}
        </ul>
      )}
      <Pagination page={current} pages={pages} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
    </div>
  );
}
