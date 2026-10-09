"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarClock, Quote, ShieldCheck } from "lucide-react";
import { LAB_BY_SLUG } from "@/config/labs";
import { useNow } from "@/hooks/use-now";
import { useDebounced } from "@/hooks/use-debounced";
import { DEAL_STATUS_META } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Deal, DealKind, DealStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BookmarkButton } from "./bookmark-button";
import { Chip, ChipRow, EmptyState, SearchInput } from "./filters";
import { LabLogo } from "./lab-logo";
import { TimeAgo } from "./time-ago";
import { extHref } from "@/lib/url";

const KIND_LABEL: Record<DealKind, string> = {
  "free-model": "Model gratis",
  "free-tier": "Free tier",
  credits: "Free credits",
  discount: "Diskon/harga",
  trial: "Trial",
  promo: "Promo",
};

const GROUPS: { key: string; title: string; note: string; match: (d: Deal) => boolean }[] = [
  { key: "programs", title: "Free tier & program resmi", note: "Diverifikasi ulang setiap run: halaman resmi diambil dan teks bukti harus ditemukan.", match: (d) => !d.id.startsWith("openrouter-") && !d.id.startsWith("lab-") && !d.id.startsWith("hn-") },
  { key: "models", title: "Model gratis (live dari OpenRouter API)", note: "Harga input & output $0 menurut API publik OpenRouter saat pengecekan terakhir.", match: (d) => d.id.startsWith("openrouter-") },
  { key: "labs", title: "Pengumuman promo & harga dari lab", note: "Terdeteksi dari feed resmi lab. Masa berlaku belum tentu tercantum.", match: (d) => d.id.startsWith("lab-") },
  { key: "community", title: "Sinyal komunitas", note: "Dari Hacker News — belum diverifikasi, cek sendiri di sumbernya.", match: (d) => d.id.startsWith("hn-") },
];

/** Recomputes expiry in the browser so a stale build never shows an ended promo as active. */
function effectiveStatus(d: Deal, now: number | null): DealStatus {
  if (now !== null && d.endsAt && Date.parse(d.endsAt) < now) return "expired";
  return d.status;
}

function DealCard({ deal, status }: { deal: Deal; status: DealStatus }) {
  const meta = DEAL_STATUS_META[status];
  const lab = deal.lab ? LAB_BY_SLUG[deal.lab] : undefined;
  return (
    <article className={cn("card-surface flex h-full flex-col p-4", status === "expired" && "opacity-60")}>
      <header className="flex items-start gap-3">
        {lab && <LabLogo logo={lab.logo} name={lab.name} size="sm" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-[11px] font-semibold", meta.className)} title={meta.hint}>
              {status === "active" && <ShieldCheck className="size-3" />}
              {meta.label}
            </span>
            <span className="inline-flex h-5 items-center rounded-md border px-1.5 text-[11px] text-muted-foreground">{KIND_LABEL[deal.kind]}</span>
          </div>
          <h3 className="mt-1.5 text-[15px] font-semibold leading-snug tracking-tight">{deal.title}</h3>
          <p className="text-xs text-muted-foreground">{deal.provider}</p>
        </div>
        <BookmarkButton entry={{ id: deal.id, kind: "deal", title: deal.title, url: deal.url, lab: deal.lab, subtitle: deal.provider, date: deal.startsAt ?? deal.firstSeenAt }} />
      </header>

      {deal.description && <p className="mt-2 line-clamp-3 text-[13px] text-muted-foreground">{deal.description}</p>}
      <p className="mt-2 text-[13px] text-foreground/85">
        <span className="font-medium text-foreground">Syarat: </span>
        {deal.terms}
      </p>

      {deal.evidence && (
        <blockquote className="mt-2.5 flex gap-2 rounded-lg border-l-2 border-emerald-500/60 bg-subtle/70 px-3 py-2 text-[12px] italic text-muted-foreground">
          <Quote className="mt-0.5 size-3 shrink-0" />
          <span className="line-clamp-3">{deal.evidence}</span>
        </blockquote>
      )}

      <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <dt className="text-muted-foreground">Mulai</dt>
          <dd className="font-medium">{deal.startsAt ? formatDate(deal.startsAt) : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Berakhir</dt>
          <dd className={cn("font-medium", deal.endsAt && "text-amber-600 dark:text-amber-400")}>{deal.endsAt ? formatDate(deal.endsAt) : "Tidak dicantumkan"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Diverifikasi</dt>
          <dd className="font-medium">{deal.lastVerifiedAt ? <TimeAgo iso={deal.lastVerifiedAt} /> : "Belum"}</dd>
        </div>
      </dl>

      <footer className="mt-auto flex items-center justify-between pt-3 text-[11.5px] text-muted-foreground">
        <span className="truncate">{deal.sourceName}</span>
        <a href={extHref(deal.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-foreground hover:underline">
          Sumber resmi <ArrowUpRight className="size-3.5" />
        </a>
      </footer>
    </article>
  );
}

export function DealsView({ deals }: { deals: Deal[] }) {
  const now = useNow();
  const [status, setStatus] = useState<DealStatus | "all">("all");
  const [kind, setKind] = useState<DealKind | "all">("all");
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim().toLowerCase());

  const withStatus = useMemo(() => deals.map((d) => ({ deal: d, status: effectiveStatus(d, now) })), [deals, now]);
  const filtered = withStatus.filter(
    ({ deal, status: s }) =>
      (status === "all" ? s !== "expired" : s === status) &&
      (kind === "all" || deal.kind === kind) &&
      (!q || `${deal.title} ${deal.provider} ${deal.description}`.toLowerCase().includes(q)),
  );
  const countBy = (s: DealStatus) => withStatus.filter((x) => x.status === s).length;
  const kinds = [...new Set(deals.map((d) => d.kind))];

  return (
    <div className="space-y-6">
      <div className="card-surface space-y-3 p-3 sm:p-4">
        <ChipRow>
          <Chip active={status === "all"} onClick={() => setStatus("all")} count={withStatus.length - countBy("expired")}>Semua yang berlaku</Chip>
          {(["active", "announced", "unverified", "expired"] as DealStatus[]).map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)} count={countBy(s)}>
              {DEAL_STATUS_META[s].label}
            </Chip>
          ))}
        </ChipRow>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput value={query} onChange={setQuery} placeholder="Cari promo, model gratis, provider…" className="flex-1" />
          <ChipRow className="sm:flex-nowrap">
            <Chip active={kind === "all"} onClick={() => setKind("all")}>Semua jenis</Chip>
            {kinds.map((k) => (
              <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</Chip>
            ))}
          </ChipRow>
        </div>
      </div>

      {filtered.length === 0 && <EmptyState icon={<CalendarClock className="size-6" />} title="Tidak ada deal untuk filter ini" />}

      {GROUPS.map((g) => {
        const list = filtered.filter((x) => g.match(x.deal));
        if (!list.length) return null;
        return (
          <section key={g.key} aria-labelledby={`deals-${g.key}`}>
            <div className="mb-3">
              <h2 id={`deals-${g.key}`} className="text-base font-semibold tracking-tight">
                {g.title} <span className="text-sm font-normal text-muted-foreground">· {list.length}</span>
              </h2>
              <p className="text-xs text-muted-foreground">{g.note}</p>
            </div>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map(({ deal, status: s }) => (
                <li key={deal.id}>
                  <DealCard deal={deal} status={s} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
