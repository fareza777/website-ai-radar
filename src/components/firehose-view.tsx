"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Download, Inbox, Loader2, ShieldCheck } from "lucide-react";
import { LABS, LAB_BY_SLUG } from "@/config/labs";
import { useDebounced } from "@/hooks/use-debounced";
import { CATEGORY_META } from "@/lib/categories";
import { dayKey, formatDate } from "@/lib/format";
import { useRadarState } from "@/lib/storage";
import { CATEGORIES, type FirehoseRow, type SignalStream } from "@/lib/types";
import { extHref } from "@/lib/url";
import { cn } from "@/lib/utils";
import { Chip, ChipRow, EmptyState, Pagination, SearchInput, Segmented } from "./filters";
import { LabLogo } from "./lab-logo";
import { TimeAgo } from "./time-ago";

interface Payload {
  generatedAt: string | null;
  rows: FirehoseRow[];
}

const STREAMS: { key: SignalStream; label: string; hint: string; className: string }[] = [
  { key: "official", label: "Official", hint: "Blogs, changelogs, GitHub releases, Hugging Face", className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" },
  { key: "press", label: "Press", hint: "Media reports (Google News) — not verified", className: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  { key: "social", label: "Social", hint: "Posts on X and Threads (official accounts + curated)", className: "bg-pink-500/12 text-pink-700 dark:text-pink-300" },
  { key: "paper", label: "Papers", hint: "Hugging Face Daily Papers", className: "bg-violet-500/12 text-violet-700 dark:text-violet-300" },
  { key: "community", label: "Community", hint: "Hacker News discussions", className: "bg-orange-500/12 text-orange-700 dark:text-orange-300" },
];
const STREAM_BY = Object.fromEntries(STREAMS.map((s) => [s.key, s])) as Record<SignalStream, (typeof STREAMS)[number]>;

type Range = "1" | "3" | "7" | "30" | "all";
type Sort = "newest" | "signal";
const PER_PAGE = 100;
const DAY = 86_400_000;

let payloadPromise: Promise<Payload> | null = null;
function loadPayload(): Promise<Payload> {
  payloadPromise ??= fetch("/firehose.json")
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<Payload>;
    })
    .catch((err: unknown) => {
      payloadPromise = null;
      throw err;
    });
  return payloadPromise;
}

function metric(r: FirehoseRow): string {
  switch (r.s) {
    case "official": return `${r.m}`;
    case "press": return `${r.x ?? 1} ${r.x === 1 ? "report" : "reports"}`;
    case "paper": return `▲ ${r.m}`;
    case "community": return `${r.m} pts · ${r.x ?? 0}💬`;
    case "social": return r.m ? `♥ ${r.m}` : "—";
  }
}

/** Spreadsheet-safe CSV cell: titles and tweets are attacker-controlled, so a leading = + - @ must not become a formula. */
function csvCell(v: string | number | undefined): string {
  const raw = String(v ?? "");
  const s = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Search form: case-insensitive, with hyphens/underscores as spaces ("GPT-6" finds "GPT 6" and the reverse). */
const searchForm = (s: string) => s.toLowerCase().replace(/[-_]+/g, " ");

function download(name: string, mime: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function FirehoseView() {
  const params = useSearchParams();
  const state = useRadarState();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const initialStreams = (params.get("s") ?? "").split(",").filter((s): s is SignalStream => s in STREAM_BY);
  const [streams, setStreams] = useState<SignalStream[]>(initialStreams.length ? initialStreams : ["official", "press", "social", "paper", "community"]);
  const [lab, setLab] = useState(params.get("lab") ?? "all");
  const [category, setCategory] = useState<string>("all");
  const [range, setRange] = useState<Range>("7");
  const [sort, setSort] = useState<Sort>("newest");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [followingOnly, setFollowingOnly] = useState(false);
  const [page, setPage] = useState(1);
  const q = useDebounced(query.trim().toLowerCase());

  useEffect(() => {
    loadPayload().then(setData, () => setError(true));
  }, []);

  const ref = data?.generatedAt ? Date.parse(data.generatedAt) : 0;

  const inRange = useMemo(() => {
    if (!data) return [];
    return range === "all" ? data.rows : data.rows.filter((r) => ref - Date.parse(r.a) < Number(range) * DAY);
  }, [data, range, ref]);

  const filtered = useMemo(() => {
    const labMatch = (r: FirehoseRow) => (lab === "all" ? true : r.l === lab);
    const list = inRange.filter(
      (r) =>
        streams.includes(r.s) &&
        labMatch(r) &&
        (!followingOnly || (r.l !== "" && state.follows.includes(r.l))) &&
        (category === "all" || r.c === category) &&
        (!verifiedOnly || r.v === 1) &&
        (!q || searchForm(`${r.t} ${r.w} ${LAB_BY_SLUG[r.l]?.name ?? ""}`).includes(searchForm(q))),
    );
    return sort === "signal" ? [...list].sort((a, b) => b.m - a.m || b.a.localeCompare(a.a)) : list;
  }, [inRange, streams, lab, followingOnly, state.follows, category, verifiedOnly, q, sort]);

  const counts = useMemo(() => {
    const c: Record<SignalStream, number> = { official: 0, press: 0, social: 0, paper: 0, community: 0 };
    for (const r of inRange) c[r.s]++;
    return c;
  }, [inRange]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const touch = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };
  const toggleStream = (s: SignalStream) => touch(setStreams)(streams.includes(s) ? streams.filter((x) => x !== s) : [...streams, s]);

  const exportCsv = () => {
    const head = "published,stream,lab,category,title,source,signal,url";
    const lines = filtered.map((r) => [r.a, r.s, LAB_BY_SLUG[r.l]?.name ?? "", r.c ?? "", r.t, r.w, metric(r), r.u].map(csvCell).join(","));
    download("ai-radar-firehose.csv", "text/csv", [head, ...lines].join("\n"));
  };
  const exportJson = () => download("ai-radar-firehose.json", "application/json", JSON.stringify(filtered, null, 2));

  if (error) return <EmptyState icon={<Inbox className="size-6" />} title="Could not load the firehose">Reload the page to try again.</EmptyState>;
  if (!data) {
    return (
      <div className="card-surface flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading every signal…
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-label="All signals">
      <div className="card-surface space-y-3 p-3 sm:p-4">
        <ChipRow>
          {STREAMS.map((s) => (
            <Chip key={s.key} active={streams.includes(s.key)} onClick={() => toggleStream(s.key)} count={counts[s.key]}>
              <span title={s.hint}>{s.label}</span>
            </Chip>
          ))}
          <span className="mx-1 w-px shrink-0 self-stretch bg-border" />
          {(["1", "3", "7", "30", "all"] as Range[]).map((r) => (
            <Chip key={r} active={range === r} onClick={() => touch(setRange)(r)}>{r === "all" ? "All time" : r === "1" ? "24h" : `${r}d`}</Chip>
          ))}
        </ChipRow>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <SearchInput value={query} onChange={touch(setQuery)} placeholder="Search every title, source, and lab…" className="flex-1" />
          <select value={lab} onChange={(e) => touch(setLab)(e.target.value)} aria-label="Filter by lab" className="h-9 rounded-lg border bg-surface/60 px-3 text-sm outline-none focus:border-ring lg:w-52">
            <option value="all">All labs</option>
            {LABS.map((l) => (
              <option key={l.slug} value={l.slug}>{l.name}</option>
            ))}
          </select>
          <Segmented<Sort> ariaLabel="Sort" value={sort} onChange={touch(setSort)} options={[{ value: "newest", label: "Newest" }, { value: "signal", label: "Strongest signal" }]} />
        </div>

        <ChipRow>
          <Chip active={category === "all"} onClick={() => touch(setCategory)("all")}>Any category</Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => touch(setCategory)(c)}>{CATEGORY_META[c].label}</Chip>
          ))}
          <span className="mx-1 w-px shrink-0 self-stretch bg-border" />
          <Chip active={verifiedOnly} onClick={() => touch(setVerifiedOnly)(!verifiedOnly)}>✓ Verified official links</Chip>
          <Chip active={followingOnly} onClick={() => touch(setFollowingOnly)(!followingOnly)} count={state.follows.length || undefined}>★ Following</Chip>
        </ChipRow>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[13.5px] text-muted-foreground" aria-live="polite">
        <span>
          <b className="text-foreground tabular-nums">{filtered.length.toLocaleString("en-US")}</b> of {data.rows.length.toLocaleString("en-US")} signals
          {pages > 1 && <> · page {current}/{pages}</>}
        </span>
        <span className="flex items-center gap-2">
          <button type="button" onClick={exportCsv} className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-surface/60 px-2.5 font-medium transition hover:text-foreground"><Download className="size-3.5" /> CSV</button>
          <button type="button" onClick={exportJson} className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-surface/60 px-2.5 font-medium transition hover:text-foreground"><Download className="size-3.5" /> JSON</button>
        </span>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<Inbox className="size-6" />} title="No signals match these filters">Widen the time range or enable more streams.</EmptyState>
      ) : (
        <div className="card-surface overflow-hidden">
          <ul className="divide-y">
            {visible.map((r, i) => {
              const lab = r.l ? LAB_BY_SLUG[r.l] : undefined;
              const stream = STREAM_BY[r.s];
              const newDay = sort === "newest" && (i === 0 || dayKey(visible[i - 1].a) !== dayKey(r.a));
              return (
                <li key={r.i}>
                  {newDay && <div className="bg-subtle/70 px-4 py-1.5 text-[12.5px] font-semibold uppercase tracking-wider text-muted-foreground">{formatDate(r.a)}</div>}
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-4 py-2.5 transition hover:bg-subtle/50 md:grid-cols-[116px_92px_160px_minmax(0,1fr)_170px_96px]">
                    <TimeAgo iso={r.a} className="text-[13px] text-muted-foreground" />
                    <span className={cn("order-2 inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold md:order-none", stream.className)} title={stream.hint}>
                      {r.s === "official" && r.v === 1 && <ShieldCheck className="size-3" />}
                      {stream.label}
                    </span>
                    <span className="order-3 col-span-2 flex min-w-0 items-center gap-2 text-[13.5px] md:order-none md:col-span-1">
                      {lab ? (
                        <>
                          <LabLogo logo={lab.logo} name={lab.name} size="xs" />
                          <span className="truncate">{lab.name}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>
                    <a href={extHref(r.u)} target="_blank" rel="noopener noreferrer" className="order-1 col-span-2 min-w-0 text-[15px] leading-snug hover:underline md:order-none md:col-span-1 md:truncate" title={r.t}>
                      {r.c && <span className={cn("mr-2 inline-block size-2 rounded-full align-middle", CATEGORY_META[r.c as keyof typeof CATEGORY_META]?.dot)} title={r.c} />}
                      {r.t}
                    </a>
                    <span className="order-4 hidden truncate text-[13px] text-muted-foreground md:block" title={r.w}>{r.w}</span>
                    <span className="order-5 hidden text-right text-[13px] tabular-nums text-muted-foreground md:block">{metric(r)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Pagination page={current} pages={pages} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
    </section>
  );
}
