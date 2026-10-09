"use client";

import { useMemo, useState } from "react";
import { CheckCheck, Inbox } from "lucide-react";
import { LABS } from "@/config/labs";
import { useNow } from "@/hooks/use-now";
import { useDebounced } from "@/hooks/use-debounced";
import { CATEGORY_META, IMPORTANT_THRESHOLD } from "@/lib/categories";
import type { FeedItem } from "@/lib/data";
import { dayKey, formatDayHeader } from "@/lib/format";
import { getPrevVisit, isRead, markAllRead, readIndex, useRadarState } from "@/lib/storage";
import { CATEGORIES, type Category } from "@/lib/types";
import { Chip, ChipRow, EmptyState, SearchInput, Segmented } from "./filters";
import { UpdateCard } from "./update-card";

type Range = "today" | "7d" | "30d";
type Sort = "newest" | "important";

const RANGE_DAYS: Record<Range, number> = { today: 1, "7d": 7, "30d": 30 };
const PAGE = 30;

export function FeedView({ items, dataTime }: { items: FeedItem[]; dataTime: string }) {
  const now = useNow();
  const state = useRadarState();
  const [range, setRange] = useState<Range>("7d");
  const [importantOnly, setImportantOnly] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [category, setCategory] = useState<Category | "all">("all");
  const [lab, setLab] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const q = useDebounced(query.trim().toLowerCase());

  const ref = now ?? Date.parse(dataTime);
  const idx = useMemo(() => readIndex(state), [state]);
  const prevVisit = now ? getPrevVisit() : null;

  const inRange = useMemo(
    () => items.filter((i) => ref - Date.parse(i.publishedAt) < RANGE_DAYS[range] * 86_400_000),
    [items, ref, range],
  );

  const filtered = useMemo(() => {
    const list = inRange.filter(
      (i) =>
        (category === "all" || i.category === category) &&
        (lab === "all" || i.lab === lab) &&
        (!importantOnly || i.importance >= IMPORTANT_THRESHOLD) &&
        (!unreadOnly || !isRead(idx, i.id, i.publishedAt)) &&
        (!q || `${i.title} ${i.summary} ${i.lab} ${i.tags.join(" ")}`.toLowerCase().includes(q)),
    );
    return sort === "important"
      ? [...list].sort((a, b) => b.importance - a.importance || b.publishedAt.localeCompare(a.publishedAt))
      : list;
  }, [inRange, category, lab, importantOnly, unreadOnly, idx, q, sort]);

  const catCounts = useMemo(() => {
    const c = Object.fromEntries(CATEGORIES.map((k) => [k, 0])) as Record<Category, number>;
    for (const i of inRange) c[i.category]++;
    return c;
  }, [inRange]);

  const unreadCount = useMemo(() => inRange.filter((i) => !isRead(idx, i.id, i.publishedAt)).length, [inRange, idx]);
  const visible = filtered.slice(0, limit);
  const reset = () => setLimit(PAGE);

  return (
    <section aria-labelledby="feed-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="feed-title" className="text-lg font-semibold tracking-tight">Global Feed</h2>
          <p className="text-sm text-muted-foreground">Semua update 20 lab dalam satu timeline kronologis.</p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented<Sort>
            ariaLabel="Urutkan"
            value={sort}
            onChange={(v) => { setSort(v); reset(); }}
            options={[{ value: "newest", label: "Terbaru" }, { value: "important", label: "Terpenting" }]}
          />
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-surface/60 px-2.5 text-[12.5px] font-medium text-muted-foreground transition hover:text-foreground"
            title="Tandai semua sebagai dibaca"
          >
            <CheckCheck className="size-4" /> <span className="hidden sm:inline">Tandai dibaca</span>
          </button>
        </div>
      </div>

      <div className="card-surface space-y-3 p-3 sm:p-4">
        <ChipRow>
          <Chip active={range === "today"} onClick={() => { setRange("today"); reset(); }}>Today</Chip>
          <Chip active={range === "7d"} onClick={() => { setRange("7d"); reset(); }}>7 Hari</Chip>
          <Chip active={range === "30d"} onClick={() => { setRange("30d"); reset(); }}>30 Hari</Chip>
          <span className="mx-1 w-px shrink-0 self-stretch bg-border" />
          <Chip active={importantOnly} onClick={() => { setImportantOnly((v) => !v); reset(); }}>Important Only</Chip>
          <Chip active={unreadOnly} onClick={() => { setUnreadOnly((v) => !v); reset(); }} count={now ? unreadCount : undefined}>Unread</Chip>
        </ChipRow>
        <ChipRow>
          <Chip active={category === "all"} onClick={() => { setCategory("all"); reset(); }} count={inRange.length}>Semua</Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => { setCategory(c); reset(); }} count={catCounts[c]}>
              {CATEGORY_META[c].label}
            </Chip>
          ))}
        </ChipRow>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={query} onChange={(v) => { setQuery(v); reset(); }} placeholder="Filter feed…" className="flex-1" />
          <select
            value={lab}
            onChange={(e) => { setLab(e.target.value); reset(); }}
            aria-label="Filter lab"
            className="h-9 rounded-lg border bg-surface/60 px-3 text-sm outline-none focus:border-ring sm:w-52"
          >
            <option value="all">Semua lab</option>
            {LABS.map((l) => (
              <option key={l.slug} value={l.slug}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {filtered.length} update{filtered.length > visible.length ? ` · menampilkan ${visible.length}` : ""}
      </p>

      {visible.length === 0 ? (
        <EmptyState icon={<Inbox className="size-6" />} title="Tidak ada update untuk filter ini">
          Coba perluas rentang waktu atau hapus filter. Collector berjalan otomatis setiap 3 jam.
        </EmptyState>
      ) : (
        <ol className="space-y-3">
          {visible.map((item, i) => {
            const showDay = sort === "newest" && (i === 0 || dayKey(visible[i - 1].publishedAt) !== dayKey(item.publishedAt));
            return (
              <li key={item.id}>
                {showDay && (
                  <h3 className="sticky top-14 z-10 -mx-1 mb-2 mt-5 bg-background/85 px-1 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur first:mt-0">
                    {formatDayHeader(item.publishedAt)}
                  </h3>
                )}
                <UpdateCard
                  item={item}
                  unread={now !== null && !isRead(idx, item.id, item.publishedAt)}
                  isNew={!!prevVisit && item.publishedAt > prevVisit}
                />
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
            Tampilkan {Math.min(PAGE, filtered.length - visible.length)} lagi
          </button>
        </div>
      )}
    </section>
  );
}
