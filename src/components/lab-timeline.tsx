"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import { useDebounced } from "@/hooks/use-debounced";
import { useNow } from "@/hooks/use-now";
import { CATEGORY_META, IMPORTANT_THRESHOLD } from "@/lib/categories";
import type { FeedItem } from "@/lib/data";
import { dayKey, formatDayHeader } from "@/lib/format";
import { getPrevLabVisit, getPrevVisit, isRead, markLabVisited, readIndex, useRadarState } from "@/lib/storage";
import { CATEGORIES, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Chip, ChipRow, EmptyState, Pagination, SearchInput, Segmented } from "./filters";
import { UpdateCard } from "./update-card";

type Range = "7" | "30" | "90" | "all";
type Sort = "newest" | "important";
const PER_PAGE = 15;

export function LabTimeline({ slug, items, dataTime }: { slug: string; items: FeedItem[]; dataTime: string }) {
  const now = useNow();
  const state = useRadarState();
  const [category, setCategory] = useState<Category | "all">("all");
  const [range, setRange] = useState<Range>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [importantOnly, setImportantOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(query.trim().toLowerCase());
  // Previous-session visit (null until mounted → no hydration mismatch).
  const visitedBefore = now !== null ? (getPrevLabVisit(slug) ?? getPrevVisit()) : null;

  // Stamp this visit so the Labs grid badge resets.
  useEffect(() => {
    const t = setTimeout(() => markLabVisited(slug), 1500);
    return () => clearTimeout(t);
  }, [slug]);

  const ref = now ?? Date.parse(dataTime);
  const idx = useMemo(() => readIndex(state), [state]);

  const inRange = useMemo(
    () => (range === "all" ? items : items.filter((i) => ref - Date.parse(i.publishedAt) < Number(range) * 86_400_000)),
    [items, range, ref],
  );

  const counts = useMemo(() => {
    const c = Object.fromEntries(CATEGORIES.map((k) => [k, 0])) as Record<Category, number>;
    for (const i of inRange) c[i.category]++;
    return c;
  }, [inRange]);

  const filtered = useMemo(() => {
    const list = inRange.filter(
      (i) =>
        (category === "all" || i.category === category) &&
        (!importantOnly || i.importance >= IMPORTANT_THRESHOLD) &&
        (!q || `${i.title} ${i.summary} ${i.tags.join(" ")} ${i.sourceName}`.toLowerCase().includes(q)),
    );
    return sort === "important" ? [...list].sort((a, b) => b.importance - a.importance || b.publishedAt.localeCompare(a.publishedAt)) : list;
  }, [inRange, category, importantOnly, q, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const change = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <section aria-label="Timeline update" className="space-y-4">
      <div className="card-surface space-y-3 p-3 sm:p-4">
        <ChipRow>
          <Chip active={category === "all"} onClick={() => change(setCategory)("all")} count={inRange.length}>Semua</Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => change(setCategory)(c)} count={counts[c]} className={counts[c] === 0 ? "opacity-50" : undefined}>
              {CATEGORY_META[c].label}
            </Chip>
          ))}
        </ChipRow>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <SearchInput value={query} onChange={change(setQuery)} placeholder="Cari di timeline lab ini…" className="flex-1" />
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<Range>
              ariaLabel="Rentang waktu"
              value={range}
              onChange={change(setRange)}
              options={[{ value: "7", label: "7h" }, { value: "30", label: "30h" }, { value: "90", label: "90h" }, { value: "all", label: "Semua" }]}
            />
            <Segmented<Sort> ariaLabel="Urutkan" value={sort} onChange={change(setSort)} options={[{ value: "newest", label: "Terbaru" }, { value: "important", label: "Terpenting" }]} />
            <Chip active={importantOnly} onClick={() => change(setImportantOnly)(!importantOnly)}>Penting</Chip>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {filtered.length} update · halaman {current} dari {pages}
      </p>

      {visible.length === 0 ? (
        <EmptyState icon={<Inbox className="size-6" />} title="Belum ada update untuk filter ini">
          Lab ini mungkin belum merilis apa pun di rentang waktu tersebut. Lihat status sumber di atas untuk detail coverage.
        </EmptyState>
      ) : (
        <ol className="relative space-y-3 pl-6 before:absolute before:bottom-2 before:left-[6px] before:top-2 before:w-px before:bg-border sm:pl-8 sm:before:left-[10px]">
          {visible.map((item, i) => {
            const showDay = sort === "newest" && (i === 0 || dayKey(visible[i - 1].publishedAt) !== dayKey(item.publishedAt));
            return (
              <li key={item.id} className="relative">
                {showDay && (
                  <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">{formatDayHeader(item.publishedAt)}</h3>
                )}
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -left-[24px] top-5 size-[13px] rounded-full ring-4 ring-background sm:-left-[28px]",
                      CATEGORY_META[item.category].dot,
                    )}
                  />
                  <UpdateCard
                    item={item}
                    showLab={false}
                    unread={now !== null && !isRead(idx, item.id, item.publishedAt)}
                    isNew={!!visitedBefore && item.publishedAt > visitedBefore}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Pagination
        page={current}
        pages={pages}
        onChange={(p) => {
          setPage(p);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </section>
  );
}
