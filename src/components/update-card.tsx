"use client";

import Link from "next/link";
import { ArrowUpRight, Flame, Layers, Lightbulb, RefreshCw } from "lucide-react";
import { LAB_BY_SLUG } from "@/config/labs";
import { IMPORTANT_THRESHOLD } from "@/lib/categories";
import type { FeedItem } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { markRead } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { CategoryBadge, VerifyBadge } from "./badges";
import { BookmarkButton } from "./bookmark-button";
import { LabLogo } from "./lab-logo";
import { TimeAgo } from "./time-ago";
import { extHref } from "@/lib/url";

interface UpdateCardProps {
  item: FeedItem;
  unread?: boolean;
  isNew?: boolean;
  showLab?: boolean;
  compact?: boolean;
}

export function UpdateCard({ item, unread = false, isNew = false, showLab = true, compact = false }: UpdateCardProps) {
  const lab = LAB_BY_SLUG[item.lab];
  const important = item.importance >= IMPORTANT_THRESHOLD;
  const edited = item.updatedAt.slice(0, 10) !== item.publishedAt.slice(0, 10);

  return (
    <article
      className={cn("lab-glow card-surface group p-4 transition hover:border-foreground/15 sm:p-5", unread && "border-l-2 border-l-brand/70")}
      style={{ ["--lab" as string]: lab?.color }}
    >
      <header className="flex items-center gap-2 text-xs text-muted-foreground">
        {showLab && lab && (
          <Link href={`/labs/${lab.slug}`} className="flex min-w-0 items-center gap-2 font-medium text-foreground/90 hover:text-foreground">
            <LabLogo logo={lab.logo} name={lab.name} size="xs" />
            <span className="truncate">{lab.name}</span>
          </Link>
        )}
        <CategoryBadge category={item.category} />
        {important && (
          <span className="inline-flex h-5 items-center gap-0.5 rounded-md bg-orange-500/10 px-1.5 text-[12.5px] font-medium text-orange-600 dark:text-orange-300" title={`Relevance score ${item.importance}/100`}>
            <Flame className="size-3" /> Important
          </span>
        )}
        {isNew && <span className="rounded-md bg-brand/15 px-1.5 text-[12.5px] font-semibold text-brand">New</span>}
        <span className="ml-auto flex items-center gap-1 whitespace-nowrap">
          <TimeAgo iso={item.publishedAt} />
        </span>
        <BookmarkButton
          className="-my-1.5 -mr-1.5"
          entry={{ id: item.id, kind: "update", title: item.title, url: item.url, lab: item.lab, subtitle: item.summary, date: item.publishedAt }}
        />
      </header>

      <h3 className={cn("mt-2 text-[16px] font-semibold leading-snug tracking-tight sm:text-base", unread ? "text-foreground" : "text-foreground/80")}>
        <a href={extHref(item.url)} target="_blank" rel="noopener noreferrer" onClick={() => markRead(item.id)} className="decoration-brand/50 underline-offset-4 hover:underline">
          {item.title}
          <ArrowUpRight className="ml-1 inline size-3.5 -translate-y-px text-muted-foreground opacity-0 transition group-hover:opacity-100" />
        </a>
      </h3>

      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>

      {!compact && (
        <p className="mt-2.5 flex gap-2 rounded-lg bg-subtle/70 px-3 py-2 text-[14px] leading-relaxed text-foreground/80">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
          <span>
            <span className="font-medium text-foreground">Why it matters: </span>
            {item.benefit}
          </span>
        </p>
      )}

      <footer className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
        <span className="truncate">{item.sourceName}</span>
        <VerifyBadge verified={item.verified} trust={item.trust} />
        {edited && (
          <span className="inline-flex items-center gap-1" title="The source content changed after it was first detected">
            <RefreshCw className="size-3" /> updated {formatDate(item.updatedAt)}
          </span>
        )}
        {item.seenIn ? (
          <span className="inline-flex items-center gap-1" title="The same story was detected in other sources (merged)">
            <Layers className="size-3" /> +{item.seenIn} {item.seenIn === 1 ? "source" : "sources"}
          </span>
        ) : null}
        {item.tags.slice(0, 3).map((t) => (
          <span key={t} className="rounded bg-muted px-1.5 py-px font-mono text-[12px]">
            #{t}
          </span>
        ))}
      </footer>
    </article>
  );
}
