import Link from "next/link";
import { ArrowDown, ArrowUpRight, Boxes, Gift, Radio, Rocket, Zap } from "lucide-react";
import { Bento } from "@/components/bento";
import { BriefingCard } from "@/components/briefing-card";
import { FeedView } from "@/components/feed-view";
import { JsonLd } from "@/components/json-ld";
import { LiveRadar, type RadarBlip, type RadarSector } from "@/components/live-radar";
import { TimeAgo } from "@/components/time-ago";
import {
  LabActivityPanel, PapersPanel, Panel, PulsePanel, SocialPanel, StoriesPanel, Ticker, TopicsPanel, TrendingPanel, UnconfirmedPanel,
} from "@/components/today-widgets";
import { LABS } from "@/config/labs";
import {
  dataTime, getAllItems, getBriefings, getDeals, getDiscover, getLabStats, getModels, getPapers, getPriceMoves, getPulse, getSocial, getStatus, getStories, toFeedItem,
} from "@/lib/data";
import { compactNumber, formatDate } from "@/lib/format";
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
    <div className="overview-stat">
      <div className="stat-heading flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Icon className="size-4 text-brand/80" />
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[36px] font-semibold leading-none tracking-[-0.05em] tabular-nums">{value}</span>
        <span className="text-[13px] leading-relaxed text-muted-foreground">{hint}</span>
      </div>
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
  const buzz = [...discover.filter((d) => d.kind === "tip"), ...discover.filter((d) => d.kind === "x"), ...discover.filter((d) => d.kind === "newsletter")].slice(0, 4);
  const models = getModels();
  const newModels = models.filter((m) => m.createdAt && ref - Date.parse(m.createdAt) < 7 * DAY).slice(0, 5);
  const pulse = getPulse().filter((p) => ref - Date.parse(p.at) < 3 * DAY).slice(0, 6);
  const papers = getPapers()
    .filter((p) => p.lab && ref - Date.parse(p.submittedAt) < 7 * DAY)
    .sort((a, b) => b.upvotes - a.upvotes);
  const social = getSocial().filter((p) => ref - Date.parse(p.at) < 7 * DAY);

  return (
    <div className="today-page">
      <JsonLd data={websiteJsonLd(siteUrl())} />
      <div className="overview-heading">
        <div>
          <p className="eyebrow">Your daily intelligence</p>
          <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.045em] sm:text-[40px]">The AI landscape, in focus<span className="text-brand">.</span></h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">Releases, research, and the shifts that matter. One clear view.</p>
        </div>
        <div className="overview-heading-actions">
          {status && <span className="flex items-center gap-2 text-[13px] text-muted-foreground"><span className="size-1.5 rounded-full bg-brand" />{formatDate(status.generatedAt)}<span className="text-border">/</span>Updated <TimeAgo iso={status.generatedAt} /></span>}
          <div className="flex items-center gap-2">
            <Link href="/digest" className="quiet-button">Weekly digest <ArrowUpRight className="size-3.5" /></Link>
            <a href="#global-feed" className="primary-button">Explore the feed <ArrowDown className="size-3.5" /></a>
          </div>
        </div>
      </div>
      <Ticker items={ticker} />
      {briefing && (
        <div className="overview-stats" aria-label="AI activity at a glance">
          <StatTile icon={Zap} label="Updates in 24 hours" value={briefing.stats.updates24h} hint={`${briefing.stats.labsActive24h} active labs`} />
          <StatTile icon={Rocket} label="New models this week" value={briefing.stats.newModels7d} hint="models & checkpoints" />
          <StatTile icon={Boxes} label="Updates this week" value={briefing.stats.updates7d} hint={`${compactNumber(all.length)} archived`} />
          <StatTile icon={Radio} label="Sources monitored" value={sources} hint={`${LABS.length} labs · every 3h`} />
        </div>
      )}
      <div className="overview-grid">
        <BriefingCard briefing={briefing} itemsById={itemsById} columns={2} />
        <LiveRadar blips={blips} sectors={sectors} windowHours={RADAR_HOURS} />
        <StoriesPanel stories={stories.stories} />
        <div className="overview-signals">
          <TrendingPanel entities={stories.trending.entities} />
          <TopicsPanel topics={stories.trending.topics} />
        </div>
      </div>

      <Bento topStory={topStory} buzz={buzz} newModels={newModels} moves={getPriceMoves()} freeModels={models.filter((m) => m.free).length} />

      <FeedView
        items={feed}
        dataTime={status?.generatedAt ?? new Date(0).toISOString()}
        rail={
          <>
            <LabActivityPanel stats={stats} />
            <UnconfirmedPanel items={stories.unconfirmed} />
            <SocialPanel posts={social} official={social.filter((p) => p.official).length} />
            <PulsePanel items={pulse} />
            <PapersPanel papers={papers} />
            {deals.length > 0 && (
              <Panel title="Verified active deals" icon={Gift} href="/deals">
                <ul className="space-y-2.5">
                  {deals.map((d) => (
                    <li key={d.id}>
                      <a href={extHref(d.url)} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                        <span>
                          <span className="block text-[16px] font-medium group-hover:underline">{d.title}</span>
                          <span className="text-[15px] text-muted-foreground">{d.provider}</span>
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
