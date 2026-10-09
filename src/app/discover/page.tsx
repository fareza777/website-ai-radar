import type { Metadata } from "next";
import Link from "next/link";
import { Send } from "lucide-react";
import { DiscoverView } from "@/components/discover-view";
import { StartupRadar } from "@/components/startup-radar";
import { TimeAgo } from "@/components/time-ago";
import { getDiscover, getStartups, getStatus, toDiscoverCard } from "@/lib/data";

export const metadata: Metadata = {
  title: "Discover — Opportunity Radar",
  description:
    "New AI startups, products, coding tools, agents, and GitHub projects — surfaced from X buzz (via newsletters and tips), GitHub, Hacker News, Hugging Face, and startup news.",
  alternates: { canonical: "/discover" },
};

export default function DiscoverPage() {
  const items = getDiscover().map(toDiscoverCard);
  const startups = getStartups();
  const status = getStatus();
  const sources = (status?.sources ?? []).filter((s) => s.lab === "discover");
  const live = sources.filter((s) => s.ok).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-brand">Discover · Opportunity Radar</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">AI tools, agents & startups on the rise</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Surfaced from public signals: posts buzzing on X (read via official embeds), newsletters that curate AI Twitter, GitHub, Hacker News, and
            Hugging Face. <span className="font-medium text-foreground">“Brand new”</span> = created in the last 60 days;{" "}
            <span className="font-medium text-foreground">“Newly spotted”</span> = first seen in public signals recently.
          </p>
        </div>
        <Link
          href="/submit"
          className="group inline-flex shrink-0 items-center gap-3 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm transition hover:bg-brand/15"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-foreground text-base font-bold text-background">𝕏</span>
          <span>
            <span className="block font-semibold">Spotted something on X?</span>
            <span className="text-muted-foreground">Send a tip — it shows up here in minutes</span>
          </span>
          <Send className="size-4 text-brand transition group-hover:translate-x-0.5" />
        </Link>
      </header>

      <details className="card-surface group px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-emerald-500/60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-medium">{live} live signal sources</span>
          <span className="text-muted-foreground">· GitHub, Hacker News, X via oEmbed, newsletters, tips, HF Spaces, startup news</span>
          <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Show</span>
          <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">Hide</span>
        </summary>
        <ul className="mt-3 flex flex-wrap gap-2 text-[13px] text-muted-foreground">
          {sources.map((s) => (
            <li key={s.id} className="inline-flex items-center gap-1.5 rounded-full border bg-surface/60 px-2.5 py-1">
              <span className={s.ok ? "size-1.5 rounded-full bg-emerald-500" : "size-1.5 rounded-full bg-muted-foreground/50"} />
              {s.name}
              {s.ok && s.lastSuccessAt ? <> · <TimeAgo iso={s.lastSuccessAt} /></> : s.lastError ? <> · {s.lastError}</> : null}
            </li>
          ))}
        </ul>
      </details>

      <DiscoverView items={items} />
      <StartupRadar items={startups} />
    </div>
  );
}
