import type { Metadata } from "next";
import { Gift, Sparkles, TrendingDown } from "lucide-react";
import { LabLogo } from "@/components/lab-logo";
import { ModelsView, PriceMoves } from "@/components/models-view";
import { TimeAgo } from "@/components/time-ago";
import { LAB_BY_SLUG } from "@/config/labs";
import { dataTime, getModels, getPriceMoves, getStatus, toModelRow } from "@/lib/data";
import { usd } from "@/lib/format";

export const metadata: Metadata = {
  title: "Models & Price Tracker",
  description: "Every major LLM with live per-token pricing, context length, free models, and a tracker of price drops and increases.",
  alternates: { canonical: "/models" },
};

export default function ModelsPage() {
  const models = getModels();
  const moves = getPriceMoves();
  const ref = dataTime();
  const status = getStatus()?.sources.find((s) => s.id === "models-openrouter");
  const newest = models.filter((m) => m.createdAt && ref - Date.parse(m.createdAt) < 7 * 86_400_000).slice(0, 6);
  const free = models.filter((m) => m.free).length;
  const cheapestFrontier = models
    .filter((m) => m.lab && !m.free && (m.contextLength ?? 0) >= 100_000)
    .sort((a, b) => a.prompt + a.completion - (b.prompt + b.completion))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand">Models & Price Tracker</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{models.length} models, live pricing, every price move</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          List prices from the public OpenRouter models API, snapshotted every run{status?.lastSuccessAt ? <> (last check <TimeAgo iso={status.lastSuccessAt} />)</> : null}.
          Only models with an explicit numeric price are listed. {free} are currently free.
        </p>
      </header>

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="card-surface p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><TrendingDown className="size-4 text-brand" /> Price moves · 90 days</h2>
          <PriceMoves moves={moves} limit={6} />
        </section>
        <section className="card-surface p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-brand" /> New this week</h2>
          {newest.length ? (
            <ul className="space-y-2.5">
              {newest.map((m) => {
                const lab = m.lab ? LAB_BY_SLUG[m.lab] : undefined;
                return (
                  <li key={m.id} className="flex items-center gap-2.5 text-[14px]">
                    {lab ? <LabLogo logo={lab.logo} name={lab.name} size="xs" /> : <span className="size-5" />}
                    <a href={`https://openrouter.ai/${m.id}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium hover:underline">{m.name}</a>
                    <span className="font-mono text-[12.5px] text-muted-foreground">{m.free ? "Free" : `${usd(m.prompt)}/${usd(m.completion)}`}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[14px] text-muted-foreground">No new models in the last 7 days.</p>
          )}
        </section>
        <section className="card-surface p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Gift className="size-4 text-brand" /> Cheapest long-context (lab models, ≥100K)</h2>
          <ul className="space-y-2.5">
            {cheapestFrontier.map((m) => {
              const lab = m.lab ? LAB_BY_SLUG[m.lab] : undefined;
              return (
                <li key={m.id} className="flex items-center gap-2.5 text-[14px]">
                  {lab ? <LabLogo logo={lab.logo} name={lab.name} size="xs" /> : <span className="size-5" />}
                  <a href={`https://openrouter.ai/${m.id}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium hover:underline">{m.name}</a>
                  <span className="font-mono text-[12.5px] text-muted-foreground">{usd(m.prompt)}/{usd(m.completion)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <ModelsView rows={models.map(toModelRow)} />
    </div>
  );
}
