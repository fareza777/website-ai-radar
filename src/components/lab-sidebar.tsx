import Link from "next/link";
import { Activity, ArrowUpRight, Layers, Newspaper, Radar } from "lucide-react";
import { LAB_BY_SLUG } from "@/config/labs";
import { CATEGORY_META } from "@/lib/categories";
import type { LabStat } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { CATEGORIES, type Category, type LabConfig, type PressItem, type UpdateItem } from "@/lib/types";
import { extHref } from "@/lib/url";
import { LabLogo } from "./lab-logo";
import { TimeAgo } from "./time-ago";
import { Panel } from "./today-widgets";

const PRESS_MAX = 4;

/** Sticky side rail for a lab page: release rhythm, what the lab ships, latest press, and quick hops to other labs. */
export function LabSidebar({ lab, stat, items, stats, press }: { lab: LabConfig; stat?: LabStat; items: UpdateItem[]; stats: LabStat[]; press: PressItem[] }) {
  const weeks = stat?.weeks ?? [];
  const maxWeek = Math.max(1, ...weeks);
  const quiet = weeks.every((n) => n === 0);

  const mix = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const i of items) mix[i.category]++;
  const mixRows = CATEGORIES.filter((c) => mix[c] > 0).sort((a, b) => mix[b] - mix[a]);
  const mixTotal = Math.max(1, items.length);

  const others = [...stats]
    .filter((s) => s.slug !== lab.slug)
    .sort((a, b) => b.last7 - a.last7 || b.last30 - a.last30)
    .slice(0, 6)
    .map((s) => ({ s, l: LAB_BY_SLUG[s.slug] }))
    .filter((x): x is { s: LabStat; l: LabConfig } => !!x.l);

  return (
    <aside aria-label={`${lab.name} at a glance`} className="thin-scroll space-y-5 xl:sticky xl:top-[4.5rem] xl:max-h-[calc(100vh-5.5rem)] xl:overflow-y-auto xl:pr-1">
      {weeks.length > 0 && (
        <Panel title="Release rhythm" icon={Activity} hint="12 weeks">
          <div className="flex h-24 items-end gap-1.5" role="img" aria-label={`Official posts per week, last 12 weeks: ${weeks.join(", ")}`}>
            {weeks.map((n, i) => (
              <span
                key={i}
                title={`${n} ${n === 1 ? "post" : "posts"}`}
                className="flex-1 rounded-t-md"
                style={{ height: `${Math.max(6, (n / maxWeek) * 100)}%`, background: n ? lab.color : "var(--muted)", opacity: n ? 0.45 + 0.55 * (n / maxWeek) : 1 }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[12px] text-muted-foreground">
            <span>12 weeks ago</span>
            <span>this week</span>
          </div>
          {quiet && (
            <p className="mt-2 text-[13px] text-muted-foreground">
              No official posts in 12 weeks{stat?.latestAt ? <> · last one {formatDate(stat.latestAt)}</> : null}.
            </p>
          )}
        </Panel>
      )}

      {mixRows.length > 0 && (
        <Panel title="What they ship" icon={Layers} hint={`${items.length} in archive`}>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            {mixRows.map((c) => (
              <span key={c} className={CATEGORY_META[c].dot} style={{ width: `${(mix[c] / mixTotal) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-3 space-y-1.5">
            {mixRows.map((c) => (
              <li key={c} className="flex items-center gap-2 text-[14px]">
                <span className={`size-2 rounded-full ${CATEGORY_META[c].dot}`} />
                <span className="flex-1">{CATEGORY_META[c].label}</span>
                <span className="tabular-nums text-muted-foreground">{mix[c]}</span>
                <span className="w-10 text-right text-[12.5px] tabular-nums text-muted-foreground/80">{Math.round((mix[c] / mixTotal) * 100)}%</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {press.length > 0 && (
        <Panel title="In the press" icon={Newspaper} hint="not verified">
          <ul className="space-y-3">
            {press.slice(0, PRESS_MAX).map((p) => (
              <li key={p.id}>
                <a href={extHref(p.url)} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-1.5">
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[14px] font-medium leading-snug group-hover:underline">{p.title}</span>
                    <span className="text-[12.5px] text-muted-foreground">
                      {p.outlet}
                      {p.reports > 1 ? ` +${p.reports - 1}` : ""} · <TimeAgo iso={p.publishedAt} />
                    </span>
                  </span>
                  <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {others.length > 0 && (
        <Panel title="Other active labs" icon={Radar} href="/labs">
          <ul className="space-y-1">
            {others.map(({ s, l }) => (
              <li key={l.slug}>
                <Link href={`/labs/${l.slug}`} prefetch={false} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-[14px] transition hover:bg-accent">
                  <LabLogo logo={l.logo} name={l.name} size="xs" />
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  <span className="text-[12.5px] tabular-nums text-muted-foreground">{s.last7} · 7d</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </aside>
  );
}
