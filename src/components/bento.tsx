import Link from "next/link";
import { ArrowUpRight, Cpu, Flame, Lightbulb, Megaphone, TrendingDown } from "lucide-react";
import { LAB_BY_SLUG } from "@/config/labs";
import { DISCOVER_KIND_LABEL } from "@/lib/categories";
import { usd } from "@/lib/format";
import type { DiscoverItem, ModelEntry, PriceMove, UpdateItem } from "@/lib/types";
import { extHref } from "@/lib/url";
import { CategoryBadge } from "./badges";
import { LabLogo } from "./lab-logo";
import { PriceMoves } from "./models-view";
import { TimeAgo } from "./time-ago";

interface BentoProps {
  topStory: UpdateItem | undefined;
  buzz: DiscoverItem[];
  newModels: ModelEntry[];
  moves: PriceMove[];
  freeModels: number;
}

function Tile({ title, icon: Icon, href, children, className }: { title: string; icon: typeof Flame; href: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card-surface dashboard-panel flex min-w-0 flex-col ${className ?? ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold">
          <Icon className="size-3.5 text-brand" /> {title}
        </h2>
        <Link href={href} aria-label={`View all: ${title}`} className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground hover:text-brand">
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
      {children}
    </section>
  );
}

/** "This week at a glance": top story + X buzz + new models + price moves. */
export function Bento({ topStory, buzz, newModels, moves, freeModels }: BentoProps) {
  const lab = topStory ? LAB_BY_SLUG[topStory.lab] : undefined;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
      {topStory && lab && (
        <a
          href={extHref(topStory.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="card-surface group relative flex flex-col overflow-hidden p-5 md:col-span-2 xl:col-span-5"
        >
          <div className="relative flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium text-brand">
              <Flame className="size-3.5" /> In the spotlight
            </span>
            <CategoryBadge category={topStory.category} />
            <TimeAgo iso={topStory.publishedAt} className="ml-auto" />
          </div>
          <div className="relative mt-4 flex items-center gap-2">
            <LabLogo logo={lab.logo} name={lab.name} size="sm" />
            <span className="text-xs font-medium">{lab.name}</span>
          </div>
          <h2 className="relative mt-3 text-balance text-[22px] font-semibold leading-snug tracking-[-0.035em] group-hover:text-brand">{topStory.title}</h2>
          <p className="relative mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">{topStory.summary}</p>
          <p className="relative mt-auto flex gap-2 border-t pt-3 text-[12px] leading-relaxed text-foreground/80">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-brand" />
            {topStory.benefit}
          </p>
          <ArrowUpRight className="absolute right-4 top-4 size-5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
        </a>
      )}

      <Tile title="On the discovery radar" icon={Megaphone} href="/discover" className="xl:col-span-4">
        <ul className="divide-y">
          {buzz.map((d) => (
            <li key={d.id}>
              <a href={extHref(d.url)} target="_blank" rel="noopener noreferrer" className="group block py-3 first:pt-1">
                <span className="flex items-center gap-2">
                  <span className="text-[13px] font-medium group-hover:text-brand">{d.name}</span>
                  <span className="ml-auto rounded border px-1.5 py-0.5 text-[9px] text-muted-foreground">{DISCOVER_KIND_LABEL[d.kind]}</span>
                </span>
                <span className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{d.quote ? `“${d.quote.text}” — @${d.quote.handle}` : d.summary}</span>
              </a>
            </li>
          ))}
        </ul>
      </Tile>

      <div className="grid min-w-0 gap-4 xl:col-span-3">
        <Tile title="New models · 7d" icon={Cpu} href="/models">
          <p className="mb-3 text-[10px] text-muted-foreground">Input price per 1M tokens</p>
          <ul className="space-y-2.5">
            {newModels.map((m) => {
              const l = m.lab ? LAB_BY_SLUG[m.lab] : undefined;
              return (
                <li key={m.id} className="flex items-center gap-2 text-[11px]">
                  {l ? <LabLogo logo={l.logo} name={l.name} size="xs" /> : <span className="size-5" />}
                  <a href={`https://openrouter.ai/${m.id}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium hover:underline">{m.name}</a>
                  <span className={`shrink-0 font-mono text-[10px] ${m.free ? "text-brand" : "text-muted-foreground"}`}>{m.free ? "Free" : usd(m.prompt)}</span>
                </li>
              );
            })}
            {!newModels.length && <li className="text-[14px] text-muted-foreground">No new models this week.</li>}
          </ul>
        </Tile>

        <Tile title="Price moves" icon={TrendingDown} href="/models">
          {moves.length ? <PriceMoves moves={moves} limit={3} /> : (
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              No price changes yet — tracking started recently. <span className="font-medium text-foreground">{freeModels} models</span> are free right now.
            </p>
          )}
        </Tile>
      </div>
    </div>
  );
}
