import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { SubmitTip } from "@/components/submit-tip";
import { TimeAgo } from "@/components/time-ago";
import { getDiscover } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Send a tip",
  description: "Spotted a great AI startup or tool on X? Send it to AI Radar — it is verified and added to Discover automatically.",
  path: "/submit",
});

const STEPS = [
  { n: "1", title: "Paste the post", body: "Copy the link of an X or Threads post (Share → Copy link) and paste it here, plus the product URL if you have it." },
  { n: "2", title: "Create the GitHub issue", body: "A prefilled issue opens — press Create. It also works from the GitHub mobile app." },
  { n: "3", title: "Verified & published", body: "The collector reads the post via X's official embed, follows its links, checks the product page, and adds it to Discover." },
];

const GOOD_TIPS = [
  { title: "Has a real product page", body: "A website or GitHub repo that loads — that page is where names and descriptions come from." },
  { title: "Is about AI", body: "A model, agent, developer tool, or startup building with AI." },
  { title: "Is new or newly noticed", body: "Freshly launched, or suddenly getting attention — the radar is for what's next." },
  { title: "Comes from the source", body: "The builder's own post beats a repost or a screenshot of one." },
];

export default function SubmitPage() {
  // Real tips already on the radar: shows what a good submission turns into.
  const recent = getDiscover()
    .filter((d) => d.kind === "tip")
    .sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand">Send a tip</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Spotted something great on X or Threads?</h1>
        <p className="mt-1.5 max-w-3xl text-[15px] text-muted-foreground">
          AI Radar never scrapes X. Instead, you hand it the posts worth watching — like a new startup everyone is talking about — and the pipeline does
          the rest.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start 2xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="min-w-0 space-y-4">
          <SubmitTip />
          <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            Tips from the repo owner are published automatically; tips from others appear after the owner adds the “approved” label. Nothing is published
            unless the product page itself can be loaded — names and descriptions come from that page, never invented.
          </p>
          <section aria-labelledby="good-tips" className="card-surface p-4 sm:p-5">
            <h2 id="good-tips" className="text-[15px] font-semibold tracking-tight">What makes a great tip</h2>
            <ul className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {GOOD_TIPS.map((t) => (
                <li key={t.title} className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <span>
                    <span className="block font-medium">{t.title}</span>
                    <span className="block text-[14px] text-muted-foreground">{t.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside aria-label="How tips work" className="space-y-4 lg:sticky lg:top-[4.5rem]">
          <ol className="card-surface space-y-4 p-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-bold text-brand">{s.n}</span>
                <span>
                  <span className="block font-semibold">{s.title}</span>
                  <span className="block text-[14px] text-muted-foreground">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>

          {recent.length > 0 && (
            <section className="card-surface p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
                  <Sparkles className="size-4 text-brand" /> Recently added from tips
                </h2>
                <Link href="/discover" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
                  Discover <ArrowRight className="size-3" />
                </Link>
              </div>
              <ul className="space-y-3">
                {recent.map((d) => (
                  <li key={d.id}>
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium">{d.name}</span>
                      <TimeAgo iso={d.firstSeenAt} className="shrink-0 text-[12.5px] text-muted-foreground" />
                    </span>
                    <span className="line-clamp-2 text-[13.5px] text-muted-foreground">{d.summary}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
