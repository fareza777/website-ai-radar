import type { Metadata } from "next";
import { SavedView } from "@/components/saved-view";
import { IMPORTANT_THRESHOLD } from "@/lib/categories";
import { dataTime, getAllItems, toFeedItem } from "@/lib/data";

export const metadata: Metadata = {
  title: "Saved",
  description: "AI updates, tools, and deals you saved.",
  alternates: { canonical: "/saved" },
  robots: { index: false, follow: false },
};

const PICKS = 6;

export default function SavedPage() {
  const ref = dataTime();
  // The week's most important official updates — offered as a starting point while nothing is saved yet.
  const picks = getAllItems()
    .filter((i) => i.importance >= IMPORTANT_THRESHOLD && ref - Date.parse(i.publishedAt) < 7 * 86_400_000)
    .sort((a, b) => b.importance - a.importance || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, PICKS)
    .map(toFeedItem);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand">Saved</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Your bookmarks</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Stored locally in this browser — private, no login.</p>
      </header>
      <SavedView picks={picks} />
    </div>
  );
}
