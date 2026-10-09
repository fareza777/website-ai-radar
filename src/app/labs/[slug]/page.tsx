import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { CoveragePill } from "@/components/coverage-pill";
import { LabLogo } from "@/components/lab-logo";
import { LabTimeline } from "@/components/lab-timeline";
import { TimeAgo } from "@/components/time-ago";
import { getLab, LABS } from "@/config/labs";
import { getLabItems, getLabStats, getStatus, toFeedItem } from "@/lib/data";
import { hostname } from "@/lib/format";
import { siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return LABS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/labs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lab = getLab(slug);
  if (!lab) return {};
  return {
    title: `${lab.name} — update timeline`,
    description: `Every ${lab.name} update (${lab.tagline}): models, features, APIs, pricing, promos, research, and developer releases — summarized with links to official sources.`,
    alternates: { canonical: `/labs/${lab.slug}` },
  };
}

const TYPE_LABEL = { rss: "RSS", huggingface: "Hugging Face", "github-releases": "GitHub Releases", "github-new-repos": "GitHub new repos" } as const;

export default async function LabPage({ params }: PageProps<"/labs/[slug]">) {
  const { slug } = await params;
  const lab = getLab(slug);
  if (!lab) notFound();

  const items = getLabItems(slug);
  const status = getStatus();
  const stat = getLabStats().find((s) => s.slug === slug);
  const sourceStatus = new Map((status?.sources ?? []).map((s) => [s.id, s]));
  const okCount = lab.sources.filter((s) => sourceStatus.get(s.id)?.ok).length;
  const lastSuccess = lab.sources
    .map((s) => sourceStatus.get(s.id)?.lastSuccessAt)
    .filter((x): x is string => !!x)
    .sort()
    .at(-1);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${lab.name} — AI Radar`,
    url: `${siteUrl()}/labs/${lab.slug}`,
    about: { "@type": "Organization", name: lab.name, url: lab.website },
    hasPart: items.slice(0, 10).map((i) => ({ "@type": "NewsArticle", headline: i.title, datePublished: i.publishedAt, url: i.url })),
  };

  return (
    <div className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/labs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All labs
      </Link>

      <header className="lab-glow card-surface relative overflow-hidden p-5 sm:p-7" style={{ ["--lab" as string]: lab.color }}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full opacity-25 blur-3xl" style={{ background: lab.color }} />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <LabLogo logo={lab.logo} name={lab.name} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{lab.name}</h1>
              <CoveragePill coverage={lab.coverage} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{lab.tagline}</p>
            <a href={lab.website} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-sm text-brand hover:underline">
              {hostname(lab.website)} <ExternalLink className="size-3.5" />
            </a>
          </div>
          <dl className="grid grid-cols-3 gap-4 text-center sm:text-right">
            <div>
              <dt className="text-[12.5px] text-muted-foreground">7 days</dt>
              <dd className="text-xl font-semibold tabular-nums">{stat?.last7 ?? 0}</dd>
            </div>
            <div>
              <dt className="text-[12.5px] text-muted-foreground">30 days</dt>
              <dd className="text-xl font-semibold tabular-nums">{stat?.last30 ?? 0}</dd>
            </div>
            <div>
              <dt className="text-[12.5px] text-muted-foreground">Archive</dt>
              <dd className="text-xl font-semibold tabular-nums">{items.length}</dd>
            </div>
          </dl>
        </div>

        <details className="group relative mt-5 rounded-xl border bg-subtle/50 px-4 py-3 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px]">
            <span className="font-medium">Coverage & source status</span>
            <span className="text-muted-foreground">
              · {okCount}/{lab.sources.length} sources OK
              {lastSuccess && <> · checked <TimeAgo iso={lastSuccess} /></>}
            </span>
            <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Show</span>
            <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">Hide</span>
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">{lab.coverageNote}</p>
          <ul className="mt-3 divide-y">
            {lab.sources.map((s) => {
              const st = sourceStatus.get(s.id);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-xs">
                  {st?.ok ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-rose-500" />}
                  <span className="font-medium">{s.name}</span>
                  <span className="rounded bg-muted px-1.5 py-px text-[12px] text-muted-foreground">{TYPE_LABEL[s.type]}</span>
                  {s.trust === "mirror" && <span className="rounded bg-sky-500/10 px-1.5 py-px text-[12px] text-sky-600 dark:text-sky-300">community mirror</span>}
                  <span className="ml-auto text-muted-foreground">
                    {st?.lastSuccessAt ? <>succeeded <TimeAgo iso={st.lastSuccessAt} /></> : "never succeeded"}
                    {st && !st.ok && st.lastError && <span className="ml-2 text-rose-500">({st.lastError.slice(0, 80)})</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      </header>

      <LabTimeline slug={lab.slug} items={items.map(toFeedItem)} dataTime={status?.generatedAt ?? new Date(0).toISOString()} />
    </div>
  );
}
