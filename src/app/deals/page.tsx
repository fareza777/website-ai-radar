import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { DealsView } from "@/components/deals-view";
import { getDeals } from "@/lib/data";

export const metadata: Metadata = {
  title: "Deals & Free Credits",
  description: "AI free tiers, free credits, free models, trials, and API discounts — with verification status, evidence quotes from official sources, and validity dates.",
  alternates: { canonical: "/deals" },
};

export default function DealsPage() {
  const deals = getDeals();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand">Deals & Free Credits</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Promos, free tiers & free models — verified</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Every deal shows its status, source, and last verification date. “Active” is only granted when evidence is found on the official source during the check.
        </p>
        <p className="mt-3 inline-flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <ShieldAlert className="mt-px size-4 shrink-0" />
          AI Radar never assumes a promo is still active without verification. Terms can change at any time — always read the official page before signing up.
        </p>
      </header>
      <DealsView deals={deals} />
    </div>
  );
}
