import Link from "next/link";
import { LAB_BY_SLUG } from "@/config/labs";
import type { LabStat } from "@/lib/data";
import { LabLogo } from "./lab-logo";

/** Labs × last 12 weeks. Cell intensity is relative to the busiest cell, with the exact count in the tooltip. */
export function ActivityHeatmap({ stats }: { stats: LabStat[] }) {
  const rows = [...stats].sort((a, b) => b.weeks.reduce((x, y) => x + y, 0) - a.weeks.reduce((x, y) => x + y, 0));
  const max = Math.max(1, ...rows.flatMap((r) => r.weeks));
  return (
    <section aria-labelledby="heatmap-title" className="card-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="heatmap-title" className="text-base font-semibold tracking-tight">Release rhythm · last 12 weeks</h2>
          <p className="text-[13.5px] text-muted-foreground">Official posts per week. Darker = busier. Right-most column is the current week.</p>
        </div>
        <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          less
          {[0.08, 0.3, 0.55, 0.8, 1].map((o) => (
            <span key={o} className="size-3.5 rounded-[4px]" style={{ background: `color-mix(in oklch, var(--brand) ${Math.round(o * 100)}%, var(--muted))` }} />
          ))}
          more
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-y-1 text-[13.5px]">
          <tbody>
            {rows.map((r) => {
              const lab = LAB_BY_SLUG[r.slug];
              const total = r.weeks.reduce((x, y) => x + y, 0);
              return (
                <tr key={r.slug}>
                  <th scope="row" className="w-52 pr-3 text-left font-medium">
                    <Link href={`/labs/${r.slug}`} className="flex items-center gap-2 hover:underline">
                      <LabLogo logo={lab.logo} name={lab.name} size="xs" />
                      <span className="truncate">{lab.name}</span>
                    </Link>
                  </th>
                  {r.weeks.map((n, i) => (
                    <td key={i} className="p-0.5">
                      <span
                        title={`${n} ${n === 1 ? "post" : "posts"} · ${12 - i === 1 ? "this week" : `${12 - i - 1} weeks ago`}`}
                        className="block h-6 rounded-[5px]"
                        style={{ background: n === 0 ? "var(--muted)" : `color-mix(in oklch, var(--brand) ${Math.round(18 + (n / max) * 82)}%, var(--muted))` }}
                      />
                    </td>
                  ))}
                  <td className="w-12 pl-3 text-right tabular-nums text-muted-foreground">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
