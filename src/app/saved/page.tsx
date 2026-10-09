import type { Metadata } from "next";
import { SavedView } from "@/components/saved-view";

export const metadata: Metadata = {
  title: "Saved",
  description: "AI updates, tools, and deals you saved.",
  robots: { index: false },
};

export default function SavedPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand">Saved</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Your bookmarks</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Stored locally in this browser — private, no login.</p>
      </header>
      <SavedView />
    </div>
  );
}
