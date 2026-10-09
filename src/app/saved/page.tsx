import type { Metadata } from "next";
import { SavedView } from "@/components/saved-view";

export const metadata: Metadata = {
  title: "Saved",
  description: "Update, tools, dan deals AI yang Anda simpan.",
  robots: { index: false },
};

export default function SavedPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand">Saved</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Bookmark Anda</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Tersimpan lokal di browser ini — privat, tanpa login.</p>
      </header>
      <SavedView />
    </div>
  );
}
