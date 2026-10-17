import Link from "next/link";
import { Activity, Layers, Radar } from "lucide-react";
import { LAB_BY_SLUG } from "@/config/labs";
import { CATEGORY_META } from "@/lib/categories";
import type { LabStat } from "@/lib/data";
import { CATEGORIES, type Category, type LabConfig, type UpdateItem } from "@/lib/types";
import { LabLogo } from "./lab-logo";
import { Panel } from "./today-widgets";

/** Sticky side rail for a lab page: release rhythm, what the lab ships, and quick hops to other labs. */
export function LabSidebar({ lab, stat, items, stats }: { lab: LabConfig; stat?: LabStat; items: UpdateItem[]; stats: LabStat[] }) {
  const weeks = stat?.weeks ?? [];
  const maxWeek = Math.max(1, ...weeks);

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
    <aside aria-label={`${lab.name} at a glance`} className="space-y-5 xl:sticky xl:top-[4.5rem]">
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
