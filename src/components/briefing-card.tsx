import Link from "next/link";
import { ArrowUpRight, AudioLines } from "lucide-react";
import { LAB_BY_SLUG } from "@/config/labs";
import type { Briefing, UpdateItem } from "@/lib/types";
import { LabLogo } from "./lab-logo";
import { TimeAgo } from "./time-ago";
import { extHref } from "@/lib/url";

interface BriefingCardProps {
  briefing: Briefing | undefined;
  itemsById: Map<string, UpdateItem>;
  /** Bullet grid columns on larger screens (1 when shown beside the radar). */
  columns?: 1 | 2;
}

export function BriefingCard({ briefing, itemsById, columns = 2 }: BriefingCardProps) {
  if (!briefing) return null;
  return (
    <section aria-labelledby="briefing-title" className="card-surface daily-briefing">
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 font-medium text-brand">
            <AudioLines className="size-4" /> The daily briefing
          </span>
          <span className="inline-flex items-center gap-2">
            <TimeAgo iso={briefing.generatedAt} />
            <span className="rounded border px-1.5 py-0.5 font-mono text-[12px]" title={briefing.source === "llm" ? "Summarized by an LLM from source data" : "Assembled automatically from source data (no LLM)"}>
              {briefing.source === "llm" ? "AI summary" : "Auto summary"}
            </span>
          </span>
        </div>
        <h2 id="briefing-title" className="briefing-headline">{briefing.headline}</h2>
        <ul className={columns === 2 ? "briefing-points sm:grid-cols-2" : "briefing-points"}>
          {briefing.bullets.map((b, i) => {
            const item = b.itemId ? itemsById.get(b.itemId) : undefined;
            const lab = b.lab ? LAB_BY_SLUG[b.lab] : undefined;
            const content = (
              <>
                {lab ? <LabLogo logo={lab.logo} name={lab.name} size="sm" /> : <span className="size-7" />}
                <span className="min-w-0 flex-1 text-base leading-relaxed text-foreground/90">{b.text}</span>
                {item && <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />}
              </>
            );
            return (
              <li key={i}>
                {item ? (
                  <a href={extHref(item.url)} target="_blank" rel="noopener noreferrer" className="briefing-point group">
                    {content}
                  </a>
                ) : (
                  <div className="briefing-point">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[13px] text-muted-foreground">
          <span>From the sources. Straight to the point.</span>
          <Link href="/digest" className="inline-flex items-center gap-1 font-medium text-foreground/80 transition hover:text-brand">Read the weekly digest <ArrowUpRight className="size-3" /></Link>
        </div>
      </div>
    </section>
  );
}
