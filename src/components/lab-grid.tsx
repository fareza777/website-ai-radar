"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { LABS } from "@/config/labs";
import { useNow } from "@/hooks/use-now";
import type { LabStat } from "@/lib/data";
import { useRadarState } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { CoveragePill } from "./coverage-pill";
import { SearchInput, Segmented } from "./filters";
import { LabLogo } from "./lab-logo";
import { TimeAgo } from "./time-ago";

interface LabGridProps {
  stats: LabStat[];
  /** Publish dates per lab (newest first), used for client-side "new since last visit" badges. */
  dates: Record<string, string[]>;
}

type Sort = "activity" | "az";

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex h-7 items-end gap-[2px]" aria-hidden="true">
      {data.map((v, i) => (
        <span
          key={i}
          className="w-full rounded-[1.5px]"
          style={{ height: `${v ? Math.max(14, (v / max) * 100) : 6}%`, background: v ? color : "var(--muted)", opacity: v ? 0.45 + (v / max) * 0.55 : 1 }}
        />
      ))}
    </div>
  );
}

export function LabGrid({ stats, dates }: LabGridProps) {
  const now = useNow();
  const state = useRadarState();
  const [sort, setSort] = useState<Sort>("activity");
  const [query, setQuery] = useState("");
  const statBy = useMemo(() => new Map(stats.map((s) => [s.slug, s])), [stats]);

  const labs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = LABS.filter((l) => !q || `${l.name} ${l.tagline}`.toLowerCase().includes(q));
    return sort === "az"
      ? [...list].sort((a, b) => a.name.localeCompare(b.name))
      : [...list].sort((a, b) => (statBy.get(b.slug)?.last30 ?? 0) - (statBy.get(a.slug)?.last30 ?? 0));
  }, [query, sort, statBy]);

  const newCount = (slug: string): { n: number; label: string; title: string } | null => {
    if (now === null) return null;
    const visited = state.labVisits[slug];
    const since = visited ?? new Date(now - 7 * 86_400_000).toISOString();
    const n = (dates[slug] ?? []).filter((d) => d > since).length;
    return n ? { n, label: `${n} new`, title: visited ? "New updates since your last visit to this lab" : "Updates in the last 7 days (you have not opened this lab yet)" } : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search labs…" className="sm:w-72" />
        <Segmented<Sort> ariaLabel="Sort labs" value={sort} onChange={setSort} options={[{ value: "activity", label: "Most active" }, { value: "az", label: "A–Z" }]} />
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {labs.map((lab) => {
          const s = statBy.get(lab.slug);
          const badge = newCount(lab.slug);
          return (
            <li key={lab.slug}>
              <Link
                href={`/labs/${lab.slug}`}
                className="lab-glow card-surface group flex h-full flex-col p-4 transition hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-ring"
                style={{ ["--lab" as string]: lab.color }}
              >
                <div className="flex items-start gap-3">
                  <LabLogo logo={lab.logo} name={lab.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate font-semibold tracking-tight">{lab.name}</h2>
                      <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{lab.tagline}</p>
                  </div>
                  {badge && (
                    <span title={badge.title} className={cn("shrink-0 rounded-full px-2 py-0.5 text-[12.5px] font-semibold tabular-nums", "bg-brand text-primary-foreground shadow-[0_0_14px_-3px_var(--brand)]")}>
                      {badge.label}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <Sparkline data={s?.spark ?? []} color={lab.color} />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
                  <span>
                    <span className="font-semibold text-foreground tabular-nums">{s?.last30 ?? 0}</span> updates · 30d
                  </span>
                  <CoveragePill coverage={lab.coverage} />
                </div>
                <div className="mt-1 text-[13px] text-muted-foreground">
                  {s?.latestAt ? (
                    <>Latest: <TimeAgo iso={s.latestAt} relativeDays={30} /></>
                  ) : (
                    "No updates detected yet"
                  )}
                  {" · "}
                  {lab.sources.length} sources
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
