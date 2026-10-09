"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Banknote, Handshake, Rocket } from "lucide-react";
import type { StartupEventKind, StartupNews } from "@/lib/types";
import { extHref } from "@/lib/url";
import { cn } from "@/lib/utils";
import { Chip, ChipRow } from "./filters";
import { TimeAgo } from "./time-ago";

const KIND: Record<Exclude<StartupEventKind, "other">, { label: string; icon: typeof Rocket; className: string }> = {
  funding: { label: "Funding", icon: Banknote, className: "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300" },
  launch: { label: "Launch", icon: Rocket, className: "text-sky-700 bg-sky-500/10 dark:text-sky-300" },
  acquisition: { label: "Acquisition", icon: Handshake, className: "text-amber-700 bg-amber-500/10 dark:text-amber-300" },
};

const PREVIEW = 8;

export function StartupRadar({ items }: { items: StartupNews[] }) {
  const [kind, setKind] = useState<StartupEventKind | "all">("all");
  const [expanded, setExpanded] = useState(false);
  const list = useMemo(() => items.filter((i) => kind === "all" || i.kind === kind), [items, kind]);
  const visible = expanded ? list : list.slice(0, PREVIEW);
  if (!items.length) return null;

  return (
    <section aria-labelledby="startup-radar" className="card-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="startup-radar" className="text-base font-semibold tracking-tight">Startup Radar</h2>
          <p className="text-[13px] text-muted-foreground">AI funding rounds, launches & acquisitions from TechCrunch, Google News, and YC — amounts exactly as stated in headlines.</p>
        </div>
        <ChipRow className="sm:flex-nowrap">
          <Chip active={kind === "all"} onClick={() => setKind("all")} count={items.length}>All</Chip>
          {(Object.keys(KIND) as (keyof typeof KIND)[]).map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)} count={items.filter((i) => i.kind === k).length}>
              {KIND[k].label}
            </Chip>
          ))}
        </ChipRow>
      </div>

      <ul className="mt-4 divide-y">
        {visible.map((i) => {
          const meta = i.kind === "other" ? null : KIND[i.kind];
          const Icon = meta?.icon ?? Rocket;
          return (
            <li key={i.id}>
              <a href={extHref(i.url)} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 py-3">
                <span className={cn("mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg", meta?.className)}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-muted-foreground">
                    {i.company && <span className="font-semibold text-foreground">{i.company}</span>}
                    {i.amount && <span className="rounded bg-emerald-500/10 px-1.5 font-mono font-semibold text-emerald-700 dark:text-emerald-300">{i.amount}</span>}
                    <span>{i.source}</span>
                    <span aria-hidden="true">·</span>
                    <TimeAgo iso={i.publishedAt} />
                  </span>
                  <span className="mt-0.5 block text-[14.5px] font-medium leading-snug group-hover:underline">{i.title}</span>
                </span>
                <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </a>
            </li>
          );
        })}
      </ul>
      {list.length > PREVIEW && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-2 text-sm font-medium text-brand hover:underline">
          {expanded ? "Show less" : `Show all ${list.length}`}
        </button>
      )}
    </section>
  );
}
