"use client";

import { ArrowUpRight } from "lucide-react";
import { LAB_BY_SLUG } from "@/config/labs";
import { CATEGORY_META, IMPORTANT_THRESHOLD } from "@/lib/categories";
import type { FeedItem } from "@/lib/data";
import { markRead } from "@/lib/storage";
import { extHref } from "@/lib/url";
import { cn } from "@/lib/utils";
import { BookmarkButton } from "./bookmark-button";
import { LabLogo } from "./lab-logo";
import { TimeAgo } from "./time-ago";

/** One-line density row — the same update as UpdateCard, 5× more per screen. */
export function UpdateRow({ item, unread = false, isNew = false }: { item: FeedItem; unread?: boolean; isNew?: boolean }) {
  const lab = LAB_BY_SLUG[item.lab];
  const important = item.importance >= IMPORTANT_THRESHOLD;
  return (
    <article className={cn("group flex min-w-0 items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 transition hover:border-brand/35", unread && "border-l-2 border-l-brand/70")}>
      {lab && <LabLogo logo={lab.logo} name={lab.name} size="sm" />}
      <span className={cn("hidden size-1.5 shrink-0 rounded-full sm:block", CATEGORY_META[item.category].dot)} title={CATEGORY_META[item.category].label} />
      <div className="min-w-0 flex-1">
        <a
          href={extHref(item.url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => markRead(item.id)}
          className={cn("line-clamp-2 text-base leading-snug hover:text-brand hover:underline sm:line-clamp-1", unread ? "font-semibold" : "text-foreground/80")}
          title={item.summary}
        >
          {item.title}
        </a>
        <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted-foreground sm:hidden">{lab?.name}<span aria-hidden="true">·</span>{CATEGORY_META[item.category].label}<span aria-hidden="true">·</span><TimeAgo iso={item.publishedAt} /></span>
      </div>
      {important && <span className="hidden shrink-0 rounded bg-brand/10 px-1.5 text-[12px] font-medium text-brand sm:inline">Important</span>}
      {isNew && <span className="shrink-0 rounded bg-brand/15 px-1.5 text-[12px] font-semibold text-brand">New</span>}
      <TimeAgo iso={item.publishedAt} className="hidden w-20 shrink-0 text-right text-[12px] text-muted-foreground sm:block" />
      <ArrowUpRight className="hidden size-3 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 sm:block" />
      <BookmarkButton className="-my-1 shrink-0" entry={{ id: item.id, kind: "update", title: item.title, url: item.url, lab: item.lab, subtitle: item.summary, date: item.publishedAt }} />
    </article>
  );
}
