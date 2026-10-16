"use client";

import { useState } from "react";
import { ArrowUpRight, FileText, MessageSquare, Newspaper, ShieldCheck } from "lucide-react";
import type { PaperItem, PressItem, SocialPost } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { extHref } from "@/lib/url";
import { cn } from "@/lib/utils";
import { EmptyState, Pagination } from "./filters";
import { TimeAgo } from "./time-ago";

type Tab = "official" | "press" | "social" | "papers";
const PER_PAGE = 12;

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[13.5px] text-amber-800 dark:text-amber-200">{children}</p>;
}

function Paged<T>({ rows, render, empty }: { rows: T[]; render: (row: T) => React.ReactNode; empty: string }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(page, pages);
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <>
      <ul className="space-y-2.5">{rows.slice((current - 1) * PER_PAGE, current * PER_PAGE).map(render)}</ul>
      <Pagination page={current} pages={pages} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
    </>
  );
}

/** Tabs for a lab page: official timeline (children) + press, social, and papers streams. */
export function LabStreams({ official, press, social, papers }: { official: React.ReactNode; press: PressItem[]; social: SocialPost[]; papers: PaperItem[] }) {
  const [tab, setTab] = useState<Tab>("official");
  const tabs: { key: Tab; label: string; icon: typeof Newspaper; n?: number }[] = [
    { key: "official", label: "Official", icon: ShieldCheck },
    { key: "press", label: "Press", icon: Newspaper, n: press.length },
    { key: "social", label: "Social", icon: MessageSquare, n: social.length },
    { key: "papers", label: "Papers", icon: FileText, n: papers.length },
  ];
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Streams" className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {tabs.map(({ key, label, icon: Icon, n }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition",
              tab === key ? "border-transparent bg-foreground text-background" : "bg-surface/60 text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
            {n != null && <span className={cn("text-xs tabular-nums", tab === key ? "text-background/70" : "text-muted-foreground/80")}>{n}</span>}
          </button>
        ))}
      </div>

      {tab === "official" && official}

      {tab === "press" && (
        <div className="space-y-3">
          <Notice>Media reports from Google News — <b>not verified</b> by the lab. Stories reported by several outlets are grouped.</Notice>
          <Paged
            rows={press}
            empty="No media reports captured for this lab yet."
            render={(p) => (
              <li key={p.id} className="card-surface p-4">
                <a href={extHref(p.url)} target="_blank" rel="noopener noreferrer" className="group inline-flex items-start gap-1 text-[16px] font-semibold leading-snug hover:underline">
                  {p.title} <ArrowUpRight className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
                </a>
                <p className="mt-1 text-[13.5px] text-muted-foreground">
                  {p.outlets.slice(0, 4).join(", ")}
                  {p.outlets.length > 4 ? ` +${p.outlets.length - 4}` : ""} · {p.reports} {p.reports === 1 ? "report" : "reports"} · <TimeAgo iso={p.publishedAt} />
                </p>
              </li>
            )}
          />
        </div>
      )}

      {tab === "social" && (
        <div className="space-y-3">
          <Notice>Posts on X and Threads gathered through official channels (oEmbed, X API, Threads API, newsletters, tips). Posts from the lab&rsquo;s own accounts are marked.</Notice>
          <Paged
            rows={social}
            empty="No social posts captured for this lab yet. Send one via /submit, or add an X API token to ingest the lab's accounts automatically."
            render={(p) => (
              <li key={p.id} className="card-surface p-4">
                <a href={extHref(p.url)} target="_blank" rel="noopener noreferrer" className="group block">
                  <span className="flex flex-wrap items-center gap-2 text-[13.5px] text-muted-foreground">
                    <span className="inline-flex size-6 items-center justify-center rounded-md bg-foreground text-[12px] font-bold text-background">{p.platform === "x" ? "𝕏" : "@"}</span>
                    <span className="font-medium text-foreground">{p.author}</span>
                    <span>@{p.handle}</span>
                    {p.official && <span className="rounded bg-emerald-500/12 px-1.5 font-semibold text-emerald-700 dark:text-emerald-300">official account</span>}
                    <span className="ml-auto">{p.exactTime ? <TimeAgo iso={p.at} /> : <>added {formatDate(p.at)}</>}</span>
                  </span>
                  <span className="mt-2 block whitespace-pre-line text-[15px] leading-relaxed group-hover:underline">{p.text || "Open the post to read it."}</span>
                  {p.likes ? <span className="mt-1 block text-[13px] text-muted-foreground">♥ {p.likes.toLocaleString("en-US")}{p.reposts ? ` · ↻ ${p.reposts.toLocaleString("en-US")}` : ""}</span> : null}
                </a>
              </li>
            )}
          />
        </div>
      )}

      {tab === "papers" && (
        <Paged
          rows={papers}
          empty="No papers attributed to this lab in the last 45 days."
          render={(p) => (
            <li key={p.id} className="card-surface p-4">
              <a href={extHref(p.url)} target="_blank" rel="noopener noreferrer" className="group inline-flex items-start gap-1 text-[16px] font-semibold leading-snug hover:underline">
                {p.title} <ArrowUpRight className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
              </a>
              <p className="mt-1.5 line-clamp-3 text-[14px] text-muted-foreground">{p.summary}</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[13px] text-muted-foreground">
                <span>▲ {p.upvotes}</span>
                <span>{formatDate(p.submittedAt)}</span>
                {p.githubRepo && <a href={extHref(p.githubRepo)} target="_blank" rel="noopener noreferrer" className="underline">code</a>}
              </p>
            </li>
          )}
        />
      )}
    </div>
  );
}
