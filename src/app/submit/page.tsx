import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { SubmitTip } from "@/components/submit-tip";

export const metadata: Metadata = {
  title: "Send a tip",
  description: "Spotted a great AI startup or tool on X? Send it to AI Radar — it is verified and added to Discover automatically.",
  alternates: { canonical: "/submit" },
};

const STEPS = [
  { n: "1", title: "Paste the X post", body: "Copy the post link from X (Share → Copy link) and paste it here, plus the product URL if you have it." },
  { n: "2", title: "Create the GitHub issue", body: "A prefilled issue opens — press Create. It also works from the GitHub mobile app." },
  { n: "3", title: "Verified & published", body: "The collector reads the post via X's official embed, follows its links, checks the product page, and adds it to Discover." },
];

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand">Send a tip</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Spotted something great on X?</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          AI Radar never scrapes X. Instead, you hand it the posts worth watching — like a new startup everyone is talking about — and the pipeline does
          the rest.
        </p>
      </header>

      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="card-surface p-4">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand/15 text-sm font-bold text-brand">{s.n}</span>
            <p className="mt-2 font-semibold">{s.title}</p>
            <p className="mt-0.5 text-[14px] text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>

      <SubmitTip />

      <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        Tips from the repo owner are published automatically; tips from others appear after the owner adds the “approved” label. Nothing is published
        unless the product page itself can be loaded — names and descriptions come from that page, never invented.
      </p>
    </div>
  );
}
