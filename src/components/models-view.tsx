"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Search } from "lucide-react";
import { LAB_BY_SLUG } from "@/config/labs";
import { useDebounced } from "@/hooks/use-debounced";
import type { ModelRow } from "@/lib/data";
import { compactNumber, formatDate, usd } from "@/lib/format";
import type { PriceMove } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Chip, ChipRow, EmptyState, Pagination, SearchInput, Segmented } from "./filters";
import { LabLogo } from "./lab-logo";
import { TimeAgo } from "./time-ago";

type Sort = "newest" | "input" | "output" | "context";
const PER_PAGE = 40;

function Trend({ row }: { row: ModelRow }) {
  const prev = row.history.at(-2);
  if (!prev) return null;
  const last = row.history.at(-1)!;
  const delta = last.prompt + last.completion - (prev.prompt + prev.completion);
  if (delta === 0) return null;
  const down = delta < 0;
  const Icon = down ? ArrowDownRight : ArrowUpRight;
  return (
    <span title={`Price ${down ? "dropped" : "rose"} on ${formatDate(last.at)}`} className={cn("inline-flex items-center", down ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
      <Icon className="size-3.5" />
    </span>
  );
}

function VendorBadge({ row }: { row: ModelRow }) {
  const lab = row.lab ? LAB_BY_SLUG[row.lab] : undefined;
  return lab ? (
    <LabLogo logo={lab.logo} name={lab.name} size="xs" />
  ) : (
    <span className="inline-flex size-5 items-center justify-center rounded-md border text-[11.5px] font-semibold uppercase text-muted-foreground">{row.vendor.charAt(0)}</span>
  );
}

export function PriceMoves({ moves, limit = 8 }: { moves: PriceMove[]; limit?: number }) {
  if (!moves.length) {
    return (
      <p className="text-[14px] text-muted-foreground">
        No price changes detected yet. Prices are snapshotted every run; any change to a model’s input/output price shows up here with the exact before → after values.
      </p>
    );
  }
  return (
    <ul className="divide-y">
      {moves.slice(0, limit).map((m) => {
        const down = m.to < m.from;
        const lab = m.lab ? LAB_BY_SLUG[m.lab] : undefined;
        return (
          <li key={m.id} className="flex items-center gap-3 py-2.5 text-[14px]">
            {lab ? <LabLogo logo={lab.logo} name={lab.name} size="xs" /> : <span className="size-5" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{m.name}</span>
              <span className="text-[12.5px] text-muted-foreground">
                {m.field} · {usd(m.from)} → {usd(m.to)} / 1M · <TimeAgo iso={m.at} />
              </span>
            </span>
            <span className={cn("rounded-md px-1.5 py-0.5 font-mono text-[13px] font-semibold", down ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300")}>
              {m.change > 0 ? "+" : ""}
              {m.change}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ModelsView({ rows }: { rows: ModelRow[] }) {
  const [query, setQuery] = useState("");
  const [vendor, setVendor] = useState("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const [labsOnly, setLabsOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const q = useDebounced(query.trim().toLowerCase());

  const vendors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.vendor, (counts.get(r.vendor) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = useMemo(() => {
    const list = rows.filter(
      (r) =>
        (vendor === "all" || r.vendor === vendor) &&
        (!freeOnly || r.free) &&
        (!labsOnly || !!r.lab) &&
        (!q || `${r.name} ${r.id}`.toLowerCase().includes(q)),
    );
    const by: Record<Sort, (a: ModelRow, b: ModelRow) => number> = {
      newest: (a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      input: (a, b) => a.prompt - b.prompt || a.completion - b.completion,
      output: (a, b) => a.completion - b.completion || a.prompt - b.prompt,
      context: (a, b) => (b.contextLength ?? 0) - (a.contextLength ?? 0),
    };
    return [...list].sort(by[sort]);
  }, [rows, vendor, freeOnly, labsOnly, q, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const reset = () => setPage(1);

  return (
    <section className="space-y-4" aria-label="Model catalog">
      <div className="card-surface space-y-3 p-3 sm:p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <SearchInput value={query} onChange={(v) => { setQuery(v); reset(); }} placeholder="Search models (e.g. claude, qwen, flash)…" className="flex-1" />
          <select
            value={vendor}
            onChange={(e) => { setVendor(e.target.value); reset(); }}
            aria-label="Filter by provider"
            className="h-9 rounded-lg border bg-surface/60 px-3 text-sm outline-none focus:border-ring lg:w-56"
          >
            <option value="all">All providers ({rows.length})</option>
            {vendors.map(([v, n]) => (
              <option key={v} value={v}>{v} ({n})</option>
            ))}
          </select>
          <Segmented<Sort>
            ariaLabel="Sort"
            value={sort}
            onChange={(v) => { setSort(v); reset(); }}
            options={[{ value: "newest", label: "Newest" }, { value: "input", label: "Cheapest in" }, { value: "output", label: "Cheapest out" }, { value: "context", label: "Context" }]}
          />
        </div>
        <ChipRow>
          <Chip active={freeOnly} onClick={() => { setFreeOnly((v) => !v); reset(); }} count={rows.filter((r) => r.free).length}>Free only</Chip>
          <Chip active={labsOnly} onClick={() => { setLabsOnly((v) => !v); reset(); }} count={rows.filter((r) => r.lab).length}>Tracked labs only</Chip>
        </ChipRow>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} models · prices in USD per 1M tokens (OpenRouter list price)</p>

      {visible.length === 0 ? (
        <EmptyState icon={<Search className="size-6" />} title="No models match" />
      ) : (
        <div className="card-surface overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead className="hidden border-b bg-subtle/60 text-[12.5px] uppercase tracking-wider text-muted-foreground sm:table-header-group">
              <tr>
                <th className="px-4 py-2.5 font-medium">Model</th>
                <th className="px-3 py-2.5 text-right font-medium">Input</th>
                <th className="px-3 py-2.5 text-right font-medium">Output</th>
                <th className="hidden px-3 py-2.5 text-right font-medium md:table-cell">Context</th>
                <th className="hidden px-4 py-2.5 text-right font-medium lg:table-cell">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((r) => (
                <tr key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition hover:bg-subtle/50 sm:table-row sm:p-0">
                  <td className="w-full sm:w-auto sm:px-4 sm:py-3">
                    <a href={`https://openrouter.ai/${r.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5">
                      <VendorBadge row={r} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-medium hover:underline">
                          <span className="truncate">{r.name}</span>
                          {r.free && <span className="rounded bg-emerald-500/10 px-1.5 text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">FREE</span>}
                          <Trend row={r} />
                        </span>
                        <span className="block truncate font-mono text-[12px] text-muted-foreground">{r.id}</span>
                      </span>
                    </a>
                  </td>
                  <td className="font-mono tabular-nums sm:px-3 sm:py-3 sm:text-right">
                    <span className="mr-1 text-[12px] text-muted-foreground sm:hidden">in</span>
                    {usd(r.prompt)}
                  </td>
                  <td className="font-mono tabular-nums sm:px-3 sm:py-3 sm:text-right">
                    <span className="mr-1 text-[12px] text-muted-foreground sm:hidden">out</span>
                    {usd(r.completion)}
                  </td>
                  <td className="font-mono tabular-nums text-muted-foreground sm:px-3 sm:py-3 sm:text-right md:table-cell">
                    {r.contextLength ? `${compactNumber(r.contextLength)} ctx` : "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-[13px] text-muted-foreground lg:table-cell">{r.createdAt ? formatDate(r.createdAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={current} pages={pages} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
    </section>
  );
}
