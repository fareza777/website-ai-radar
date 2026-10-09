import Link from "next/link";
import { ArrowRight, Boxes, Gift, Radio, Rocket, Zap } from "lucide-react";
import { Bento } from "@/components/bento";
import { BriefingCard } from "@/components/briefing-card";
import { FeedView } from "@/components/feed-view";
import { LabLogo } from "@/components/lab-logo";
import { LiveRadar, type RadarBlip, type RadarSector } from "@/components/live-radar";
import { LAB_BY_SLUG, LABS } from "@/config/labs";
import { getAllItems, getBriefings, getDeals, getDiscover, getLabStats, getModels, getPriceMoves, getStatus, toFeedItem } from "@/lib/data";
import { compactNumber } from "@/lib/format";
import type { UpdateItem } from "@/lib/types";
import { extHref } from "@/lib/url";

const FEED_DAYS = 30;
const RADAR_HOURS = 72;
const RADAR_MAX = 32;

function StatTile({ icon: Icon, label, value, hint }: { icon: typeof Zap; label: string; value: string | number; hint: string }) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className="text-[13px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function SideCard({ title, href, icon: Icon, children }: { title: string; href: string; icon: typeof Zap; children: React.ReactNode }) {
  return (
    <section className="card-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-brand" /> {title}
        </h2>
        <Link href={href} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          View all <ArrowRight className="size-3" />
        </Link>
      </div>
      {children}
    </section>
  );
}

/** Deterministic 0..1 from an id (stable blip jitter across builds). */
function unit(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

/** Radar geometry is computed on the server from the collector time, so markup is stable. */
function radarData(all: UpdateItem[], ref: number): { blips: RadarBlip[]; sectors: RadarSector[] } {
  const step = 360 / LABS.length;
  const sectors = LABS.map((l, i) => ({ lab: l.slug, angle: i * step + step / 2 }));
  const sectorOf = new Map(sectors.map((s) => [s.lab, s.angle]));
  const windowMs = RADAR_HOURS * 3_600_000;
  const blips = all
    .filter((i) => ref - Date.parse(i.publishedAt) < windowMs && ref >= Date.parse(i.publishedAt))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, RADAR_MAX)
    .map((i) => {
      const age = (ref - Date.parse(i.publishedAt)) / windowMs;
      return {
        id: i.id, lab: i.lab, title: i.title, url: i.url, category: i.category, importance: i.importance, publishedAt: i.publishedAt,
        angle: (sectorOf.get(i.lab) ?? 0) + (unit(i.id) - 0.5) * step * 0.7,
        radius: 0.14 + 0.8 * age,
      };
    });
  return { blips, sectors };
}

export default function TodayPage() {
  const status = getStatus();
  const all = getAllItems();
  const ref = status ? Date.parse(status.generatedAt) : 0;
  const feed = all.filter((i) => ref - Date.parse(i.publishedAt) < FEED_DAYS * 86_400_000).map(toFeedItem);
  const briefing = getBriefings()[0];
  const itemsById = new Map(all.map((i) => [i.id, i]));
  const stats = getLabStats().sort((a, b) => b.last7 - a.last7).slice(0, 8);
  const maxLast7 = Math.max(1, ...stats.map((s) => s.last7));
  const deals = getDeals().filter((d) => d.status === "active").slice(0, 4);
  const sources = status?.sources.filter((s) => !s.skipped).length ?? 0;
  const { blips, sectors } = radarData(all, ref);

  const topStory = [...all]
    .filter((i) => ref - Date.parse(i.publishedAt) < 72 * 3_600_000 && i.sourceType === "rss")
    .sort((a, b) => b.importance - a.importance || b.publishedAt.localeCompare(a.publishedAt))[0];
  const discover = getDiscover();
  const buzz = [
    ...discover.filter((d) => d.kind === "tip"),
    ...discover.filter((d) => d.kind === "x"),
    ...discover.filter((d) => d.kind === "newsletter"),
  ].slice(0, 4);
  const models = getModels();
  const newModels = models.filter((m) => m.createdAt && ref - Date.parse(m.createdAt) < 7 * 86_400_000).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-8">
          <BriefingCard briefing={briefing} itemsById={itemsById} columns={1} />
        </div>
        <div className="lg:col-span-5 xl:col-span-4">
          <LiveRadar blips={blips} sectors={sectors} windowHours={RADAR_HOURS} />
        </div>
      </div>

      {briefing && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon={Zap} label="Updates · 24h" value={briefing.stats.updates24h} hint={`from ${briefing.stats.labsActive24h} active labs`} />
          <StatTile icon={Rocket} label="Model releases · 7d" value={briefing.stats.newModels7d} hint="new models & checkpoints" />
          <StatTile icon={Boxes} label="Updates · 7d" value={briefing.stats.updates7d} hint={`${compactNumber(all.length)} in the archive`} />
          <StatTile icon={Radio} label="Sources tracked" value={sources} hint={`${LABS.length} labs · auto every 3h`} />
        </div>
      )}

      <Bento topStory={topStory} buzz={buzz} newModels={newModels} moves={getPriceMoves()} freeModels={models.filter((m) => m.free).length} />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <FeedView items={feed} dataTime={status?.generatedAt ?? new Date(0).toISOString()} />
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <div className="space-y-4 lg:sticky lg:top-20">
            <SideCard title="Most active labs · 7d" href="/labs" icon={Radio}>
              <ul className="space-y-2.5">
                {stats.map((s) => {
                  const lab = LAB_BY_SLUG[s.slug];
                  return (
                    <li key={s.slug}>
                      <Link href={`/labs/${s.slug}`} className="group flex items-center gap-2.5">
                        <LabLogo logo={lab.logo} name={lab.name} size="xs" />
                        <span className="w-28 truncate text-[14px] font-medium group-hover:text-foreground">{lab.name}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <span className="block h-full rounded-full" style={{ width: `${(s.last7 / maxLast7) * 100}%`, background: `linear-gradient(90deg, var(--brand), ${lab.color})` }} />
                        </span>
                        <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{s.last7}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </SideCard>

            {deals.length > 0 && (
              <SideCard title="Verified active deals" href="/deals" icon={Gift}>
                <ul className="space-y-2.5">
                  {deals.map((d) => (
                    <li key={d.id}>
                      <a href={extHref(d.url)} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <span>
                          <span className="block text-[14px] font-medium group-hover:underline">{d.title}</span>
                          <span className="text-[13px] text-muted-foreground">{d.provider}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </SideCard>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
