import { Boxes, Gift, Radio, Rocket, Zap } from "lucide-react";
import { Bento } from "@/components/bento";
import { BriefingCard } from "@/components/briefing-card";
import { FeedView } from "@/components/feed-view";
import { JsonLd } from "@/components/json-ld";
import { LiveRadar, type RadarBlip, type RadarSector } from "@/components/live-radar";
import {
  LabActivityPanel, PapersPanel, Panel, PulsePanel, SocialPanel, StoriesPanel, Ticker, TopicsPanel, TrendingPanel, UnconfirmedPanel,
} from "@/components/today-widgets";
import { LABS } from "@/config/labs";
import {
  dataTime, getAllItems, getBriefings, getDeals, getDiscover, getLabStats, getModels, getPapers, getPriceMoves, getPulse, getSocial, getStatus, getStories, toFeedItem,
} from "@/lib/data";
import { compactNumber } from "@/lib/format";
import { websiteJsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import type { UpdateItem } from "@/lib/types";
import { extHref } from "@/lib/url";

const FIRST_PAINT_DAYS = 7;
const RADAR_HOURS = 72;
const RADAR_MAX = 32;
const DAY = 86_400_000;

function StatTile({ icon: Icon, label, value, hint }: { icon: typeof Zap; label: string; value: string | number; hint: string }) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className="text-[13px] text-muted-foreground">{hint}</div>
    </div>
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
  const ref = dataTime();
  // Only the last 7 days ship in the HTML; days 8–30 load on demand (public/feed-older.json).
  const feed = all.filter((i) => ref - Date.parse(i.publishedAt) < FIRST_PAINT_DAYS * DAY).map(toFeedItem);
  const briefing = getBriefings()[0];
  const itemsById = new Map(all.map((i) => [i.id, i]));
  const stats = getLabStats();
  const deals = getDeals().filter((d) => d.status === "active").slice(0, 5);
  const sources = status?.sources.filter((s) => !s.skipped).length ?? 0;
  const { blips, sectors } = radarData(all, ref);
  const stories = getStories();

  const ticker = all.filter((i) => i.sourceType === "rss").slice(0, 16);
  const topStory = [...all]
    .filter((i) => ref - Date.parse(i.publishedAt) < 72 * 3_600_000 && i.sourceType === "rss")
    .sort((a, b) => b.importance - a.importance || b.publishedAt.localeCompare(a.publishedAt))[0];
  const discover = getDiscover();
  const buzz = [...discover.filter((d) => d.kind === "tip"), ...discover.filter((d) => d.kind === "x"), ...discover.filter((d) => d.kind === "newsletter")].slice(0, 6);
  const related = topStory ? all.filter((i) => i.lab === topStory.lab && i.id !== topStory.id).slice(0, 3) : [];
  const models = getModels();
  const newModels = models.filter((m) => m.createdAt && ref - Date.parse(m.createdAt) < 7 * DAY).slice(0, 5);
  const pulse = getPulse().filter((p) => ref - Date.parse(p.at) < 3 * DAY).slice(0, 6);
  const papers = getPapers()
    .filter((p) => p.lab && ref - Date.parse(p.submittedAt) < 7 * DAY)
    .sort((a, b) => b.upvotes - a.upvotes);
  const social = getSocial().filter((p) => ref - Date.parse(p.at) < 7 * DAY);

  return (
    <div className="space-y-6">
      <JsonLd data={websiteJsonLd(siteUrl())} />
      <Ticker items={ticker} />

      {/*
        SECTION 1 — OVERVIEW (what matters right now). One DOM, three layouts:
          < xl            single column; widgets ordered with order-N (briefing → radar → stats → …)
          xl  (≥1280px)   main + right column; stats/trending/topics become a strip on top
          ≥1700px (3xl)   three balanced columns
        Wrappers use display:contents below xl so every widget joins the same flex column.
      */}
      <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start xl:gap-6 3xl:grid-cols-[320px_minmax(0,1fr)_400px] 4xl:grid-cols-[360px_minmax(0,1fr)_460px]">
        {/* At 3xl the short left column sticks beside the taller briefing instead of leaving a dead gap. */}
        <div className="contents xl:col-span-full xl:grid xl:grid-cols-4 xl:items-start xl:gap-4 3xl:sticky 3xl:top-[4.5rem] 3xl:col-span-1 3xl:flex 3xl:flex-col 3xl:items-stretch 3xl:gap-5">
          {briefing && (
            <div className="order-3 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:order-none xl:grid-cols-2">
              <StatTile icon={Zap} label="Updates · 24h" value={briefing.stats.updates24h} hint={`from ${briefing.stats.labsActive24h} active labs`} />
              <StatTile icon={Rocket} label="Models · 7d" value={briefing.stats.newModels7d} hint="models & checkpoints" />
              <StatTile icon={Boxes} label="Updates · 7d" value={briefing.stats.updates7d} hint={`${compactNumber(all.length)} in the archive`} />
              <StatTile icon={Radio} label="Sources" value={sources} hint={`${LABS.length} labs · auto 3h`} />
            </div>
          )}
          <div className="order-5 min-w-0 xl:order-none"><TrendingPanel entities={stories.trending.entities} /></div>
          <div className="order-6 min-w-0 xl:order-none"><TopicsPanel topics={stories.trending.topics} /></div>
          <div className="order-7 min-w-0 xl:order-none 3xl:hidden"><LabActivityPanel stats={stats} /></div>
        </div>

        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-5">
          <div className="order-1 xl:order-none"><BriefingCard briefing={briefing} itemsById={itemsById} columns={2} /></div>
          <div className="order-4 xl:order-none"><StoriesPanel stories={stories.stories} /></div>
        </div>

        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-5">
          <div className="order-2 xl:order-none"><LiveRadar blips={blips} sectors={sectors} windowHours={RADAR_HOURS} /></div>
          <div className="order-8 xl:order-none"><UnconfirmedPanel items={stories.unconfirmed} /></div>
          <div className="hidden 3xl:block"><LabActivityPanel stats={stats} /></div>
        </div>
      </div>

      <Bento topStory={topStory} related={related} buzz={buzz} newModels={newModels} moves={getPriceMoves()} freeModels={models.filter((m) => m.free).length} />

      {/*
        SECTION 2 — WORKSPACE (everything, chronological). Filters (left) and signals (right) are sticky,
        so they stay on screen while the feed scrolls.
      */}
      <FeedView
        items={feed}
        dataTime={status?.generatedAt ?? new Date(0).toISOString()}
        rail={
          <>
            <SocialPanel posts={social} official={social.filter((p) => p.official).length} />
            <PulsePanel items={pulse} />
            <PapersPanel papers={papers} />
            {deals.length > 0 && (
              <Panel title="Verified active deals" icon={Gift} href="/deals">
                <ul className="space-y-2.5">
                  {deals.map((d) => (
                    <li key={d.id}>
                      <a href={extHref(d.url)} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <span>
                          <span className="block text-[14px] font-medium group-hover:underline">{d.title}</span>
                          <span className="text-[13px] text-muted-foreground">{d.provider}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </>
        }
      />
    </div>
  );
}
