import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Cpu, MinusCircle, XCircle } from "lucide-react";
import { CoveragePill } from "@/components/coverage-pill";
import { LabLogo } from "@/components/lab-logo";
import { TimeAgo } from "@/components/time-ago";
import { LABS } from "@/config/labs";
import { getLabStats, getStatus } from "@/lib/data";
import type { SourceStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Status & Coverage",
  description: "Transparansi sumber data AI Radar: status setiap sumber, coverage per lab, dan jadwal collector otomatis.",
  alternates: { canonical: "/status" },
};

function Row({ s }: { s: SourceStatus }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2 text-xs">
      {s.ok ? <CheckCircle2 className="size-4 text-emerald-500" /> : s.skipped ? <MinusCircle className="size-4 text-muted-foreground" /> : <XCircle className="size-4 text-rose-500" />}
      <span className="font-medium">{s.name}</span>
      <span className="text-muted-foreground">{s.accepted} item</span>
      <span className="ml-auto text-muted-foreground">
        {s.lastSuccessAt ? <>sukses <TimeAgo iso={s.lastSuccessAt} /></> : "belum pernah sukses"}
        {!s.ok && s.lastError && <span className={s.skipped ? "ml-2" : "ml-2 text-rose-500"}>{s.lastError.slice(0, 90)}</span>}
      </span>
    </li>
  );
}

export default function StatusPage() {
  const status = getStatus();
  const stats = new Map(getLabStats().map((s) => [s.slug, s]));
  const by = new Map((status?.sources ?? []).map((s) => [s.id, s]));
  const extra = (status?.sources ?? []).filter((s) => s.lab === "discover" || s.lab === "deals");
  const active = (status?.sources ?? []).filter((s) => !s.skipped);
  const ok = active.filter((s) => s.ok).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand">Status & Coverage</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Transparansi sumber data</h1>
        {status && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            Run terakhir <TimeAgo iso={status.generatedAt} /> ({(status.durationMs / 1000).toFixed(0)} dtk) · {ok}/{active.length} sumber OK · collector
            berjalan otomatis setiap 3 jam via GitHub Actions. Jika sumber gagal, data valid terakhir tetap ditampilkan.
          </p>
        )}
        {status && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border bg-surface/60 px-2.5 py-1 text-xs text-muted-foreground">
            <Cpu className="size-3.5" />
            Ringkasan LLM: {status.llm.enabled ? `aktif (${status.llm.model}) · ${status.llm.summarized} item diringkas pada run terakhir` : "nonaktif — ringkasan memakai template deterministik"}
          </p>
        )}
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        {LABS.map((lab) => {
          const st = stats.get(lab.slug);
          return (
            <section key={lab.slug} className="card-surface p-4">
              <div className="flex items-center gap-3">
                <LabLogo logo={lab.logo} name={lab.name} size="sm" />
                <Link href={`/labs/${lab.slug}`} className="font-semibold hover:underline">{lab.name}</Link>
                <CoveragePill coverage={lab.coverage} />
                <span className="ml-auto text-xs text-muted-foreground">
                  {st?.total ?? 0} item{st?.latestAt ? <> · terbaru <TimeAgo iso={st.latestAt} relativeDays={30} /></> : null}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{lab.coverageNote}</p>
              <ul className="mt-2 divide-y">
                {lab.sources.map((src) => {
                  const s = by.get(src.id);
                  return s ? <Row key={src.id} s={s} /> : <li key={src.id} className="py-2 text-xs text-muted-foreground">{src.name} — belum dijalankan</li>;
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {extra.length > 0 && (
        <section className="card-surface p-4">
          <h2 className="font-semibold">Discover & Deals</h2>
          <ul className="mt-2 divide-y">
            {extra.map((s) => <Row key={s.id} s={s} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
