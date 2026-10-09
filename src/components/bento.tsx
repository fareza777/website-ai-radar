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
export function Bento({ topStory, buzz, newModels, moves, freeModels }: BentoProps) {
  const lab = topStory ? LAB_BY_SLUG[topStory.lab] : undefined;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {topStory && lab && (
        <a
          href={extHref(topStory.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="lab-glow card-surface group relative flex flex-col overflow-hidden p-5 md:col-span-2 xl:row-span-2"
          style={{ ["--lab" as string]: lab.color }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full opacity-25 blur-3xl" style={{ background: lab.color }} />
          <div className="relative flex items-center gap-2 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-0.5 font-semibold text-orange-600 dark:text-orange-300">
              <Flame className="size-3.5" /> Top story
            </span>
            <CategoryBadge category={topStory.category} />
            <TimeAgo iso={topStory.publishedAt} className="ml-auto" />
          </div>
          <div className="relative mt-4 flex items-center gap-3">
            <LabLogo logo={lab.logo} name={lab.name} size="lg" />
            <span className="font-medium">{lab.name}</span>
          </div>
          <h2 className="relative mt-3 text-balance text-xl font-semibold leading-snug tracking-tight group-hover:underline sm:text-2xl">{topStory.title}</h2>
          <p className="relative mt-2 line-clamp-4 text-[15px] leading-relaxed text-muted-foreground">{topStory.summary}</p>
          <p className="relative mt-auto flex gap-2 pt-4 text-[14px] text-foreground/85">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
            {topStory.benefit}
          </p>
          <ArrowUpRight className="absolute right-4 top-4 size-5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
        </a>
      )}

      <Tile title="Buzzing now" icon={Megaphone} href="/discover" className="md:col-span-2">
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
  );
}
