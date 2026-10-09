import { ArrowUpRight, Sparkles } from "lucide-react";
import { LAB_BY_SLUG } from "@/config/labs";
import { formatDayHeader } from "@/lib/format";
import type { Briefing, UpdateItem } from "@/lib/types";
import { LabLogo } from "./lab-logo";
import { TimeAgo } from "./time-ago";
import { extHref } from "@/lib/url";

interface BriefingCardProps {
  briefing: Briefing | undefined;
  itemsById: Map<string, UpdateItem>;
}

export function BriefingCard({ briefing, itemsById }: BriefingCardProps) {
  if (!briefing) return null;
  return (
    <section aria-labelledby="briefing-title" className="card-surface relative overflow-hidden p-5 sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-brand-2/10 blur-3xl" />
      <div className="relative">
        <p className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-brand">
            <Sparkles className="size-3.5" /> AI Daily Briefing
          </span>
          <span>{formatDayHeader(briefing.generatedAt)}</span>
          <span aria-hidden="true">·</span>
          <span>
            updated <TimeAgo iso={briefing.generatedAt} />
          </span>
          <span className="rounded bg-muted px-1.5 py-px font-mono text-[10px]" title={briefing.source === "llm" ? "Summarized by an LLM from source data" : "Assembled automatically from source data (no LLM)"}>
            {briefing.source === "llm" ? "AI summary" : "auto"}
          </span>
        </p>
        <h1 id="briefing-title" className="mt-4 max-w-3xl text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-[32px]">
          <span className="text-gradient">{briefing.headline}</span>
        </h1>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {briefing.bullets.map((b, i) => {
            const item = b.itemId ? itemsById.get(b.itemId) : undefined;
            const lab = b.lab ? LAB_BY_SLUG[b.lab] : undefined;
            const content = (
              <>
                {lab ? <LabLogo logo={lab.logo} name={lab.name} size="sm" /> : <span className="size-7" />}
                <span className="min-w-0 flex-1 text-sm leading-snug text-foreground/90">{b.text}</span>
                {item && <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />}
              </>
            );
            return (
              <li key={i}>
                {item ? (
                  <a href={extHref(item.url)} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 rounded-xl border border-transparent bg-subtle/60 p-3 transition hover:border-border hover:bg-subtle">
                    {content}
                  </a>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl bg-subtle/60 p-3">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
