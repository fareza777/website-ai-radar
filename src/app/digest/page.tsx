import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { CopyButton } from "@/components/copy-button";
import { LAB_BY_SLUG } from "@/config/labs";
import { dataTime, getAllItems, getDeals, getDiscover, getPapers, getPriceMoves, getPulse, getSocial, getStartups, getStories } from "@/lib/data";
import { buildDigest, digestMarkdown } from "@/lib/digest";
import { formatDate } from "@/lib/format";
import { extHref } from "@/lib/url";
import { breadcrumbDocument, pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Weekly Digest",
  description: "The week in AI on one page — top stories, model releases, pricing moves, new tools, research, and community signals. Copy it as Markdown for your newsletter.",
  path: "/digest",
});

export default function DigestPage() {
  const digest = buildDigest({
    now: dataTime(),
    official: getAllItems(),
    stories: getStories(),
    discover: getDiscover(),
    startups: getStartups(),
    papers: getPapers(),
    social: getSocial(),
    pulse: getPulse(),
    moves: getPriceMoves(),
    deals: getDeals(),
    labName: (slug) => LAB_BY_SLUG[slug]?.name ?? slug,
  });
  const markdown = digestMarkdown(digest);

  return (
    <div className="space-y-6">
      <JsonLd data={breadcrumbDocument(siteUrl(), [{ name: "Weekly Digest", path: "/digest" }])} />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-brand">Weekly digest</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">The week in AI</h1>
          <p className="mt-1.5 max-w-2xl text-[15px] text-muted-foreground">
            {formatDate(digest.fromIso)} → {formatDate(digest.toIso)} · assembled automatically from official feeds, press, social, and community signals — no editorial invention.
          </p>
        </div>
        <CopyButton text={markdown} />
      </header>

      {/* Masonry columns: sections differ a lot in length, so a row grid would leave tall empty cards. */}
      <div className="gap-4 xl:columns-2 3xl:columns-3 4xl:columns-4">
        {digest.sections.map((s) => (
          <section key={s.id} aria-labelledby={`d-${s.id}`} className="card-surface mb-4 break-inside-avoid p-5">
            <h2 id={`d-${s.id}`} className="text-base font-semibold tracking-tight">{s.title}</h2>
            {s.note && <p className="mt-0.5 text-[13.5px] text-muted-foreground">{s.note}</p>}
            <ul className="mt-3 divide-y">
              {s.entries.map((e, i) => (
                <li key={`${e.url}-${i}`}>
                  <a href={extHref(e.url)} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-[15px] font-medium leading-snug group-hover:underline">{e.title}</span>
                      {e.meta && <span className="text-[13px] text-muted-foreground">{e.meta}</span>}
                    </span>
                    <ArrowUpRight className="mt-1 size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
