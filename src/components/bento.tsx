import Link from "next/link";
import { ArrowRight, ArrowUpRight, Cpu, Flame, Lightbulb, Megaphone, TrendingDown } from "lucide-react";
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
  /** Other recent updates from the top story's lab. */
  related: UpdateItem[];
  buzz: DiscoverItem[];
  newModels: ModelEntry[];
  moves: PriceMove[];
  freeModels: number;
}

function Tile({ title, icon: Icon, href, children, className }: { title: string; icon: typeof Flame; href: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card-surface flex flex-col p-4 ${className ?? ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-brand" /> {title}
        </h2>
        <Link href={href} className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
          View all <ArrowRight className="size-3" />
        </Link>
      </div>
      {children}
    </section>
  );
}

/** "This week at a glance": top story + X buzz + new models + price moves. */
export function Bento({ topStory, related, buzz, newModels, moves, freeModels }: BentoProps) {
  const lab = topStory ? LAB_BY_SLUG[topStory.lab] : undefined;
  return (
    <div className="grid gap-3 md:grid-cols-2 3xl:grid-cols-12">
      {topStory && lab && (
        <section
          className="lab-glow card-surface relative flex flex-col overflow-hidden p-5 md:col-span-2 3xl:col-span-5"
          style={{ ["--lab" as string]: lab.color }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full opacity-25 blur-3xl" style={{ background: lab.color }} />
          <a href={extHref(topStory.url)} target="_blank" rel="noopener noreferrer" className="group relative block">
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-0.5 font-semibold text-orange-600 dark:text-orange-300">
                <Flame className="size-3.5" /> Top story
              </span>
              <CategoryBadge category={topStory.category} />
              <TimeAgo iso={topStory.publishedAt} className="ml-auto" />
              <ArrowUpRight className="size-4 opacity-0 transition group-hover:opacity-100" />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <LabLogo logo={lab.logo} name={lab.name} size="lg" />
              <span className="font-medium text-foreground">{lab.name}</span>
            </div>
            <h2 className="mt-3 text-balance text-xl font-semibold leading-snug tracking-tight group-hover:underline sm:text-2xl">{topStory.title}</h2>
            <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-muted-foreground">{topStory.summary}</p>
            <p className="mt-3 flex gap-2 text-[14px] text-foreground/85">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
              {topStory.benefit}
            </p>
          </a>
          {related.length > 0 && (
            <div className="relative mt-auto pt-4">
              <div className="flex items-center justify-between border-t pt-3">
                <h3 className="text-[12.5px] font-semibold uppercase tracking-wider text-muted-foreground">More from {lab.name}</h3>
                <Link href={`/labs/${lab.slug}`} className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
                  Timeline <ArrowRight className="size-3" />
                </Link>
              </div>
              <ul className="mt-2 space-y-1.5">
                {related.map((r) => (
                  <li key={r.id}>
                    <a href={extHref(r.url)} target="_blank" rel="noopener noreferrer" className="flex items-baseline gap-2 text-[14px] hover:underline">
                      <span className="min-w-0 flex-1 truncate">{r.title}</span>
                      <TimeAgo iso={r.publishedAt} className="shrink-0 text-[12.5px] text-muted-foreground" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <Tile title="Buzzing now" icon={Megaphone} href="/discover" className="md:col-span-2 3xl:col-span-4">
        <ul className="space-y-3">
          {buzz.map((d) => (
            <li key={d.id}>
              <a href={extHref(d.url)} target="_blank" rel="noopener noreferrer" className="group block">
                <span className="flex items-center gap-2">
                  <span className="font-medium group-hover:underline">{d.name}</span>
                  <span className="rounded border px-1.5 text-[12px] text-muted-foreground">{DISCOVER_KIND_LABEL[d.kind]}</span>
                </span>
                <span className="line-clamp-1 text-[13.5px] text-muted-foreground">{d.quote ? `“${d.quote.text}” — @${d.quote.handle}` : d.summary}</span>
              </a>
            </li>
          ))}
        </ul>
      </Tile>

      <div className="grid gap-3 md:col-span-2 md:grid-cols-2 3xl:col-span-3 3xl:grid-cols-1">
        <Tile title="New models · 7d" icon={Cpu} href="/models">
          <ul className="space-y-2.5">
            {newModels.map((m) => {
              const l = m.lab ? LAB_BY_SLUG[m.lab] : undefined;
              return (
                <li key={m.id} className="flex items-center gap-2 text-[14px]">
                  {l ? <LabLogo logo={l.logo} name={l.name} size="xs" /> : <span className="size-5" />}
                  <a href={`https://openrouter.ai/${m.id}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium hover:underline">{m.name}</a>
                  <span className="font-mono text-[12px] text-muted-foreground">{m.free ? "Free" : usd(m.prompt)}</span>
                </li>
              );
            })}
            {!newModels.length && <li className="text-[14px] text-muted-foreground">No new models this week.</li>}
          </ul>
        </Tile>

        <Tile title="Price moves" icon={TrendingDown} href="/models">
          {moves.length ? <PriceMoves moves={moves} limit={3} /> : (
            <p className="text-[14px] text-muted-foreground">
              No price changes yet — tracking started recently. <span className="font-medium text-foreground">{freeModels} models</span> are free right now.
            </p>
          )}
        </Tile>
      </div>
    </div>
  );
}
