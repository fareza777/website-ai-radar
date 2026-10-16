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
    <div className={cn("group flex items-center gap-3 rounded-xl border bg-card/70 px-3 py-2 transition hover:border-foreground/15", unread && "border-l-2 border-l-brand/70")}>
      {lab && <LabLogo logo={lab.logo} name={lab.name} size="sm" />}
      <span className={cn("size-2 shrink-0 rounded-full", CATEGORY_META[item.category].dot)} title={CATEGORY_META[item.category].label} />
      <a
        href={extHref(item.url)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => markRead(item.id)}
        className={cn("min-w-0 flex-1 truncate text-[15px] hover:underline", unread ? "font-semibold" : "text-foreground/80")}
        title={item.summary}
      >
        {item.title}
      </a>
      {important && <span className="hidden shrink-0 rounded bg-orange-500/10 px-1.5 text-[12px] font-medium text-orange-600 dark:text-orange-300 sm:inline">Important</span>}
      {isNew && <span className="shrink-0 rounded bg-brand/15 px-1.5 text-[12px] font-semibold text-brand">New</span>}
      <span className="hidden w-32 shrink-0 truncate text-[13px] text-muted-foreground lg:inline">{lab?.name}</span>
      <TimeAgo iso={item.publishedAt} className="w-20 shrink-0 text-right text-[13px] text-muted-foreground" />
      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      <BookmarkButton className="-my-1 shrink-0" entry={{ id: item.id, kind: "update", title: item.title, url: item.url, lab: item.lab, subtitle: item.summary, date: item.publishedAt }} />
    </div>
  );
}
