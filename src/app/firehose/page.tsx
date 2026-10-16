import type { Metadata } from "next";
import { FirehoseView } from "@/components/firehose-view";
import { JsonLd } from "@/components/json-ld";
import { TimeAgo } from "@/components/time-ago";
import { getStatus } from "@/lib/data";
import { buildFirehoseRows } from "@/lib/firehose";
import { breadcrumbDocument, pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Firehose — every signal",
  description:
    "Every official update, media report, research paper, and community discussion tracked by AI Radar in one searchable table — filter by lab, stream, category, and time; export to CSV or JSON.",
  path: "/firehose",
});

/** First table page, rendered into the HTML so crawlers and slow connections see real content without JavaScript. */
const SERVER_ROWS = 100;

export default function FirehosePage() {
  const status = getStatus();
  const rows = buildFirehoseRows();
  return (
    <div className="space-y-6">
      <JsonLd data={breadcrumbDocument(siteUrl(), [{ name: "Firehose", path: "/firehose" }])} />
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand">Firehose</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Every signal, nothing filtered out</h1>
        <p className="mt-1.5 max-w-3xl text-[15px] text-muted-foreground">
          {rows.length.toLocaleString("en-US")} signals across five streams: <b className="text-foreground">official</b> posts, <b className="text-foreground">press</b> reports,{" "}
          <b className="text-foreground">social</b> posts (X and Threads), <b className="text-foreground">papers</b>, and <b className="text-foreground">community</b> discussions.
          {status && <> Refreshed <TimeAgo iso={status.generatedAt} />.</>} Press, social, and community items are never marked verified unless they come from a lab&rsquo;s own account.
        </p>
      </header>
      <FirehoseView initialRows={rows.slice(0, SERVER_ROWS)} generatedAt={status?.generatedAt ?? null} total={rows.length} />
    </div>
  );
}
