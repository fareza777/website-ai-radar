"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCheck, Inbox, LayoutList, Rows3, Star } from "lucide-react";
import { LABS } from "@/config/labs";
import { useNow } from "@/hooks/use-now";
import { useDebounced } from "@/hooks/use-debounced";
import { CATEGORY_META, IMPORTANT_THRESHOLD } from "@/lib/categories";
import type { FeedItem } from "@/lib/data";
import { dayKey, formatDayHeader } from "@/lib/format";
import { getPrevVisit, isRead, markAllRead, readIndex, setDensity, useRadarState } from "@/lib/storage";
import { CATEGORIES, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Chip, ChipRow, EmptyState, SearchInput, Segmented } from "./filters";
import { LabLogo } from "./lab-logo";
import { UpdateCard } from "./update-card";
import { UpdateRow } from "./update-row";

type Range = "today" | "7d" | "30d";
type Sort = "newest" | "important";

const RANGE_DAYS: Record<Range, number> = { today: 1, "7d": 7, "30d": 30 };
const PAGE = 25;

let olderPromise: Promise<FeedItem[]> | null = null;
function loadOlder(): Promise<FeedItem[]> {
  olderPromise ??= fetch("/feed-older.json")
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<FeedItem[]>;
    })
    .catch((err: unknown) => {
      olderPromise = null;
      throw err;
    });
  return olderPromise;
}

interface FeedWorkspaceProps {
  items: FeedItem[];
  dataTime: string;
  /** Server-rendered widgets shown in the sticky right rail. */
  rail?: React.ReactNode;
}

/**
 * Feed workspace with persistent filters and source context at desktop sizes.
 */
export function FeedView({ items, dataTime, rail }: FeedWorkspaceProps) {
  const now = useNow();
  const state = useRadarState();
  const [range, setRange] = useState<Range>("7d");
  const [importantOnly, setImportantOnly] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [followingOnly, setFollowingOnly] = useState(false);
  const [category, setCategory] = useState<Category | "all">("all");
  const [lab, setLab] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [older, setOlder] = useState<FeedItem[] | null>(null);
  const [olderError, setOlderError] = useState(false);
  const q = useDebounced(query.trim().toLowerCase());

  // Days 8–30 are not in the page HTML; fetch them once when the user opens the 30-day range.
  useEffect(() => {
    if (range !== "30d" || older !== null) return;
    loadOlder().then(setOlder, () => setOlderError(true));
  }, [range, older]);
  const all = useMemo(() => (older ? [...items, ...older] : items), [items, older]);

  const ref = now ?? Date.parse(dataTime);
  const idx = useMemo(() => readIndex(state), [state]);
  const prevVisit = now ? getPrevVisit() : null;

  const inRange = useMemo(() => all.filter((i) => ref - Date.parse(i.publishedAt) < RANGE_DAYS[range] * 86_400_000), [all, ref, range]);

  const matches = (i: FeedItem, withLab: boolean) =>
    (category === "all" || i.category === category) &&
    (!withLab || lab === "all" || i.lab === lab) &&
    (!followingOnly || state.follows.includes(i.lab)) &&
    (!importantOnly || i.importance >= IMPORTANT_THRESHOLD) &&
    (!unreadOnly || !isRead(idx, i.id, i.publishedAt)) &&
    (!q || `${i.title} ${i.summary} ${i.lab} ${i.tags.join(" ")}`.toLowerCase().includes(q));

  const filtered = useMemo(() => {
    const list = inRange.filter((i) => matches(i, true));
    return sort === "important" ? [...list].sort((a, b) => b.importance - a.importance || b.publishedAt.localeCompare(a.publishedAt)) : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRange, category, lab, followingOnly, state.follows, importantOnly, unreadOnly, idx, q, sort]);

  const catCounts = useMemo(() => {
    const c = Object.fromEntries(CATEGORIES.map((k) => [k, 0])) as Record<Category, number>;
    for (const i of inRange) c[i.category]++;
    return c;
  }, [inRange]);

  // Per-lab counts honor every filter except the lab itself, so the list shows what each lab would add.
  const labCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const i of inRange) if (matches(i, false)) c.set(i.lab, (c.get(i.lab) ?? 0) + 1);
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRange, category, followingOnly, state.follows, importantOnly, unreadOnly, idx, q]);

  const unreadCount = useMemo(() => inRange.filter((i) => !isRead(idx, i.id, i.publishedAt)).length, [inRange, idx]);
  const visible = filtered.slice(0, limit);
  const reset = () => setLimit(PAGE);

  const labList = LABS.map((l) => ({ lab: l, n: labCounts.get(l.slug) ?? 0 })).sort((a, b) => b.n - a.n || a.lab.name.localeCompare(b.lab.name));

  return (
    <section id="global-feed" aria-labelledby="feed-title" className="feed-workspace">
      <aside className="feed-filters thin-scroll space-y-3" aria-label="Feed filters">
        <div className="card-surface space-y-3 p-3 sm:p-4">
          <p className="feed-filter-label">Time range</p>
          <ChipRow>
            <Chip active={range === "today"} onClick={() => { setRange("today"); reset(); }}>Today</Chip>
            <Chip active={range === "7d"} onClick={() => { setRange("7d"); reset(); }}>7 Days</Chip>
            <Chip active={range === "30d"} onClick={() => { setRange("30d"); reset(); }}>30 Days</Chip>
          </ChipRow>
          <ChipRow className="flex-wrap">
            <Chip active={importantOnly} onClick={() => { setImportantOnly((v) => !v); reset(); }}>Important Only</Chip>
            <Chip active={unreadOnly} onClick={() => { setUnreadOnly((v) => !v); reset(); }} count={now ? unreadCount : undefined}>Unread</Chip>
            <Chip active={followingOnly} onClick={() => { setFollowingOnly((v) => !v); reset(); }} count={state.follows.length || undefined}>★ Following</Chip>
          </ChipRow>
          <p className="feed-filter-label border-t pt-3">Categories</p>
          <ChipRow className="feed-categories">
            <Chip active={category === "all"} onClick={() => { setCategory("all"); reset(); }} count={inRange.length}>All</Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => { setCategory(c); reset(); }} count={catCounts[c]}>
                {CATEGORY_META[c].label}
              </Chip>
            ))}
          </ChipRow>
          <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
            <SearchInput value={query} onChange={(v) => { setQuery(v); reset(); }} placeholder="Filter the feed…" className="flex-1" />
            <select
              value={lab}
              onChange={(e) => { setLab(e.target.value); reset(); }}
              aria-label="Filter by lab"
              className="h-10 rounded-lg border bg-surface/60 px-3 text-sm outline-none focus:border-ring sm:w-52 xl:hidden"
            >
              <option value="all">All labs</option>
              {LABS.map((l) => (
                <option key={l.slug} value={l.slug}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card-surface feed-labs p-2">
          <p className="feed-filter-label px-2.5 pt-2">Filter by lab</p>
          <button
            type="button"
            onClick={() => { setLab("all"); reset(); }}
            className={cn("flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[16px] font-medium transition hover:bg-accent", lab === "all" && "bg-accent")}
          >
            All labs <span className="tabular-nums text-muted-foreground">{[...labCounts.values()].reduce((a, b) => a + b, 0)}</span>
          </button>
          <ul className="mt-1 space-y-0.5">
            {labList.map(({ lab: l, n }) => (
              <li key={l.slug}>
                <button
                  type="button"
                  onClick={() => { setLab(lab === l.slug ? "all" : l.slug); reset(); }}
                  aria-pressed={lab === l.slug}
                  className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[16px] transition hover:bg-accent", lab === l.slug && "bg-accent font-semibold", n === 0 && "opacity-45")}
                >
                  <LabLogo logo={l.logo} name={l.name} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-left">{l.name}</span>
                  {state.follows.includes(l.slug) && <Star className="size-3 fill-amber-500 text-amber-500" />}
                  <span className="tabular-nums text-muted-foreground">{n}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* CENTER: the feed */}
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-1">Every signal, one place</p>
            <h2 id="feed-title" className="text-xl font-semibold tracking-tight">Global feed</h2>
            <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? "update" : "updates"}
              {filtered.length > visible.length ? ` · showing ${visible.length}` : ""} · {LABS.length} labs
              {range === "30d" && older === null && !olderError && " · loading earlier days…"}
              {olderError && " · could not load earlier days"}
            </p>
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-2">
            <Segmented<Sort>
              ariaLabel="Sort"
              value={sort}
              onChange={(v) => { setSort(v); reset(); }}
              options={[{ value: "newest", label: "Newest" }, { value: "important", label: "Priority" }]}
            />
            <div role="radiogroup" aria-label="Density" className="inline-flex h-9 items-center rounded-lg border bg-surface/60 p-0.5">
              {([["cards", LayoutList, "Cards"], ["compact", Rows3, "Compact"]] as const).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={state.density === value}
                  aria-label={label}
                  title={label}
                  onClick={() => setDensity(value)}
                  className={cn("inline-flex h-full items-center gap-1 rounded-md px-2 text-[15px] font-medium text-muted-foreground transition", state.density === value && "bg-accent text-foreground shadow-xs")}
                >
                  <Icon className="size-4" />
                  <span className="hidden 3xl:inline">{label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-surface/60 px-2.5 text-[15px] font-medium text-muted-foreground transition hover:text-foreground"
              title="Mark all as read"
            >
              <CheckCheck className="size-4" /> <span className="hidden 3xl:inline">Mark all read</span>
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={<Inbox className="size-6" />} title="No updates match these filters">
            Try a wider time range or clear filters. The collector runs automatically every 3 hours.
          </EmptyState>
        ) : (
          <ol className={state.density === "compact" ? "space-y-1.5" : "space-y-2.5"}>
            {visible.map((item, i) => {
              const showDay = sort === "newest" && (i === 0 || dayKey(visible[i - 1].publishedAt) !== dayKey(item.publishedAt));
              const unread = now !== null && !isRead(idx, item.id, item.publishedAt);
              const isNew = !!prevVisit && item.publishedAt > prevVisit;
              return (
                <li key={item.id}>
                  {showDay && (
                    <h3 className="sticky top-16 z-10 -mx-1 mb-2 mt-4 border-b bg-background/95 px-1 py-2 font-mono text-[12px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur first:mt-0">
                      {formatDayHeader(item.publishedAt)}
                    </h3>
                  )}
                  {state.density === "compact" ? <UpdateRow item={item} unread={unread} isNew={isNew} /> : <UpdateCard item={item} unread={unread} isNew={isNew} />}
                </li>
              );
            })}
          </ol>
        )}

        {filtered.length > visible.length && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setLimit((l) => l + PAGE)}
              className="inline-flex h-10 items-center rounded-xl border bg-surface/60 px-5 text-sm font-medium transition hover:bg-accent"
            >
              Show {Math.min(PAGE, filtered.length - visible.length)} more
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: widgets that stay in view while the feed scrolls */}
      {rail && (
        <aside className="feed-rail thin-scroll" aria-label="Signals">
          {rail}
        </aside>
      )}
    </section>
  );
}
