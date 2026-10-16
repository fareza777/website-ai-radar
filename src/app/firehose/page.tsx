import type { Metadata } from "next";
import { Suspense } from "react";
import { FirehoseView } from "@/components/firehose-view";
import { TimeAgo } from "@/components/time-ago";
import { getAllItems, getPapers, getPress, getPulse, getSocial, getStatus } from "@/lib/data";

export const metadata: Metadata = {
  title: "Firehose — every signal",
  description:
    "Every official update, media report, research paper, and community discussion tracked by AI Radar in one searchable table — filter by lab, stream, category, and time; export to CSV or JSON.",
  alternates: { canonical: "/firehose" },
};

export default function FirehosePage() {
  const status = getStatus();
  const total = getAllItems().length + getPress().length + getPapers().length + getPulse().length + getSocial().length;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand">Firehose</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Every signal, nothing filtered out</h1>
        <p className="mt-1.5 max-w-3xl text-[15px] text-muted-foreground">
          {total.toLocaleString("en-US")} signals across five streams: <b className="text-foreground">official</b> posts, <b className="text-foreground">press</b> reports,{" "}
          <b className="text-foreground">social</b> posts (X and Threads), <b className="text-foreground">papers</b>, and <b className="text-foreground">community</b> discussions.
          {status && <> Refreshed <TimeAgo iso={status.generatedAt} />.</>} Press, social, and community items are never marked verified unless they come from a lab&rsquo;s own account.
        </p>
      </header>
      <Suspense fallback={<div className="card-surface h-96 animate-pulse" />}>
        <FirehoseView />
      </Suspense>
    </div>
  );
}
