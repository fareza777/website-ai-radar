import type { Metadata } from "next";
import { DiscoverView } from "@/components/discover-view";
import { TimeAgo } from "@/components/time-ago";
import { getDiscover, getStatus, toDiscoverCard } from "@/lib/data";

export const metadata: Metadata = {
  title: "Discover — Opportunity Radar",
  description: "Startup, produk AI, coding tools, agent, proyek GitHub, dan platform API baru — ditemukan otomatis dari GitHub, Hacker News, dan Product Hunt.",
  alternates: { canonical: "/discover" },
};

export default function DiscoverPage() {
  const items = getDiscover().map(toDiscoverCard);
  const status = getStatus();
  const sources = (status?.sources ?? []).filter((s) => s.lab === "discover");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand">Discover · Opportunity Radar</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Tools, agents & proyek AI yang sedang naik</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Ditemukan otomatis dari sinyal publik. <span className="font-medium text-foreground">“Benar-benar baru”</span> = dibuat/diluncurkan ≤ 60 hari;{" "}
          <span className="font-medium text-foreground">“Lama tapi trending”</span> = proyek lama yang sedang mendapat momentum (lonjakan stars atau masuk Hacker News).
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-[11.5px] text-muted-foreground">
          {sources.map((s) => (
            <li key={s.id} className="inline-flex items-center gap-1.5 rounded-full border bg-surface/60 px-2.5 py-1">
              <span className={s.ok ? "size-1.5 rounded-full bg-emerald-500" : "size-1.5 rounded-full bg-muted-foreground/50"} />
              {s.name}
              {s.ok && s.lastSuccessAt ? <> · <TimeAgo iso={s.lastSuccessAt} /></> : s.lastError ? <> · {s.lastError}</> : null}
            </li>
          ))}
        </ul>
      </header>
      <DiscoverView items={items} />
    </div>
  );
}
