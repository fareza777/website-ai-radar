"use client";

import { useState } from "react";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

const X_POST = /^https:\/\/(www\.|mobile\.)?(x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/status\/\d+/;
const HTTP = /^https?:\/\/[^\s]+\.[^\s]+$/;

/** Builds a prefilled GitHub issue (issue-form field ids) — no backend, no secrets in the browser. */
function issueUrl(x: string, product: string, why: string): string {
  const label = product ? new URL(product).hostname.replace(/^www\./, "") : x.split("/")[3] ? `@${x.split("/")[3]}` : "tip";
  const q = new URLSearchParams({ template: "radar-tip.yml", title: `Tip: ${label}` });
  if (x) q.set("x_post", x);
  if (product) q.set("product", product);
  if (why) q.set("why", why);
  return `${SITE.repo}/issues/new?${q}`;
}

export function SubmitTip() {
  const [x, setX] = useState("");
  const [product, setProduct] = useState("");
  const [why, setWhy] = useState("");
  const [sent, setSent] = useState(false);

  const xVal = x.trim();
  const productVal = product.trim();
  const xError = xVal && !X_POST.test(xVal) ? "Use a post link like https://x.com/user/status/123…" : null;
  const productError = productVal && !HTTP.test(productVal) ? "Use a full URL starting with https://" : null;
  const ready = (xVal || productVal) && !xError && !productError;

  const field = "h-11 w-full rounded-xl border bg-surface/60 px-3.5 text-[15px] outline-none transition placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30";

  return (
    <form
      className="card-surface space-y-4 p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        window.open(issueUrl(xVal, productVal, why.trim()), "_blank", "noopener,noreferrer");
        setSent(true);
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">X post URL</span>
        <input className={cn(field, xError && "border-rose-500")} inputMode="url" placeholder="https://x.com/someone/status/1234567890" value={x} onChange={(e) => setX(e.target.value)} />
        {xError && <span className="mt-1 block text-[13px] text-rose-500">{xError}</span>}
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          Product URL <span className="font-normal text-muted-foreground">(website or GitHub repo — recommended)</span>
        </span>
        <input className={cn(field, productError && "border-rose-500")} inputMode="url" placeholder="https://antseed.com" value={product} onChange={(e) => setProduct(e.target.value)} />
        {productError && <span className="mt-1 block text-[13px] text-rose-500">{productError}</span>}
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          Why it’s worth watching <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <textarea className={cn(field, "h-24 py-2.5")} placeholder="e.g. P2P marketplace for AI inference, works with Claude Code" value={why} onChange={(e) => setWhy(e.target.value)} />
      </label>

      <button
        type="submit"
        disabled={!ready}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-[15px] font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        Send tip via GitHub <ArrowUpRight className="size-4" />
      </button>

      {sent && (
        <p className="flex items-start gap-2 rounded-xl bg-emerald-500/10 p-3 text-[14px] text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          A prefilled GitHub issue opened in a new tab — press “Create”. The collector picks it up within minutes, and the bot replies on the issue once it is live on Discover.
        </p>
      )}
    </form>
  );
}
