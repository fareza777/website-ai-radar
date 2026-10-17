"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Bookmark, Sparkles, Trash2 } from "lucide-react";
import { LAB_BY_SLUG } from "@/config/labs";
import type { FeedItem } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { removeBookmark, useRadarState, type SavedKind } from "@/lib/storage";
import { Chip, ChipRow } from "./filters";
import { LabLogo } from "./lab-logo";
import { UpdateCard } from "./update-card";
import { extHref } from "@/lib/url";

const KIND_LABEL: Record<SavedKind, string> = { update: "Lab updates", discover: "Discover", deal: "Deals" };

export function SavedView({ picks = [] }: { picks?: FeedItem[] }) {
  const state = useRadarState();
  const [kind, setKind] = useState<SavedKind | "all">("all");
  const all = useMemo(() => Object.values(state.bookmarks).sort((a, b) => b.savedAt.localeCompare(a.savedAt)), [state.bookmarks]);
  const list = all.filter((e) => kind === "all" || e.kind === kind);

  if (all.length === 0) {
    return (
      <div className="space-y-6">
        <div className="card-surface flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"><Bookmark className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Nothing saved yet</p>
            <p className="text-sm text-muted-foreground">
              Tap the bookmark icon on any update, Discover tool, or deal to keep it here. Stored in this browser (localStorage) — no account needed.
            </p>
          </div>
          <Link href="/" className="inline-flex h-9 shrink-0 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background">Explore the feed</Link>
        </div>
        {picks.length > 0 && (
          <section aria-labelledby="picks-title" className="space-y-3">
            <h2 id="picks-title" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <Sparkles className="size-4 text-brand" /> Worth saving this week
              <span className="hidden text-[13px] font-normal text-muted-foreground sm:inline">· the most important official updates</span>
            </h2>
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 3xl:grid-cols-3">
              {picks.map((item) => (
                <li key={item.id} className="[&>*]:h-full"><UpdateCard item={item} /></li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChipRow>
        <Chip active={kind === "all"} onClick={() => setKind("all")} count={all.length}>All</Chip>
        {(Object.keys(KIND_LABEL) as SavedKind[]).map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)} count={all.filter((e) => e.kind === k).length}>
            {KIND_LABEL[k]}
          </Chip>
        ))}
      </ChipRow>
      <ul className="grid grid-cols-1 gap-2 xl:grid-cols-2">
        {list.map((e) => {
          const lab = e.lab ? LAB_BY_SLUG[e.lab] : undefined;
          return (
            <li key={e.id} className="card-surface flex items-start gap-3 p-4">
              {lab ? <LabLogo logo={lab.logo} name={lab.name} size="sm" /> : <span className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground"><Bookmark className="size-3.5" /></span>}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-muted-foreground">
                  {KIND_LABEL[e.kind]}
                  {lab ? ` · ${lab.name}` : ""} · {formatDate(e.date)}
                </p>
                <a href={extHref(e.url)} target="_blank" rel="noopener noreferrer" className="group mt-0.5 inline-flex items-start gap-1 font-medium leading-snug hover:underline">
                  {e.title}
                  <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                </a>
                {e.subtitle && <p className="mt-0.5 line-clamp-2 text-[14px] text-muted-foreground">{e.subtitle}</p>}
              </div>
              <button type="button" onClick={() => removeBookmark(e.id)} aria-label="Remove" className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-rose-500">
                <Trash2 className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
