"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Bookmark, Trash2 } from "lucide-react";
import { LAB_BY_SLUG } from "@/config/labs";
import { formatDate } from "@/lib/format";
import { removeBookmark, useRadarState, type SavedKind } from "@/lib/storage";
import { Chip, ChipRow, EmptyState } from "./filters";
import { LabLogo } from "./lab-logo";

const KIND_LABEL: Record<SavedKind, string> = { update: "Update lab", discover: "Discover", deal: "Deals" };

export function SavedView() {
  const state = useRadarState();
  const [kind, setKind] = useState<SavedKind | "all">("all");
  const all = useMemo(() => Object.values(state.bookmarks).sort((a, b) => b.savedAt.localeCompare(a.savedAt)), [state.bookmarks]);
  const list = all.filter((e) => kind === "all" || e.kind === kind);

  if (all.length === 0) {
    return (
      <EmptyState icon={<Bookmark className="size-6" />} title="Belum ada yang disimpan">
        Tekan ikon bookmark pada update, tool di Discover, atau deal untuk menyimpannya di sini. Disimpan di browser ini (localStorage), tanpa akun.
        <div className="mt-4">
          <Link href="/" className="inline-flex h-9 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background">Jelajahi feed</Link>
        </div>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <ChipRow>
        <Chip active={kind === "all"} onClick={() => setKind("all")} count={all.length}>Semua</Chip>
        {(Object.keys(KIND_LABEL) as SavedKind[]).map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)} count={all.filter((e) => e.kind === k).length}>
            {KIND_LABEL[k]}
          </Chip>
        ))}
      </ChipRow>
      <ul className="space-y-2">
        {list.map((e) => {
          const lab = e.lab ? LAB_BY_SLUG[e.lab] : undefined;
          return (
            <li key={e.id} className="card-surface flex items-start gap-3 p-4">
              {lab ? <LabLogo logo={lab.logo} name={lab.name} size="sm" /> : <span className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground"><Bookmark className="size-3.5" /></span>}
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] text-muted-foreground">
                  {KIND_LABEL[e.kind]}
                  {lab ? ` · ${lab.name}` : ""} · {formatDate(e.date)}
                </p>
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="group mt-0.5 inline-flex items-start gap-1 font-medium leading-snug hover:underline">
                  {e.title}
                  <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                </a>
                {e.subtitle && <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{e.subtitle}</p>}
              </div>
              <button type="button" onClick={() => removeBookmark(e.id)} aria-label="Hapus" className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-rose-500">
                <Trash2 className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
