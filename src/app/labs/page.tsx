import type { Metadata } from "next";
import { LabGrid } from "@/components/lab-grid";
import { LABS } from "@/config/labs";
import { getLabItems, getLabStats } from "@/lib/data";

export const metadata: Metadata = {
  title: "AI Labs Hub",
  description: "20 lab AI global — OpenAI, Anthropic, Google DeepMind, xAI, DeepSeek, Qwen, Kimi, GLM, Meta, Mistral, dan lainnya — dengan timeline update otomatis.",
  alternates: { canonical: "/labs" },
};

export default function LabsPage() {
  const stats = getLabStats();
  // Only the last 60 days of dates are needed for "new since last visit" badges.
  const dates = Object.fromEntries(LABS.map((l) => [l.slug, getLabItems(l.slug).slice(0, 80).map((i) => i.publishedAt)]));
  const total30 = stats.reduce((n, s) => n + s.last30, 0);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand">AI Labs Hub</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">20 lab AI, satu radar</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          {total30} update dalam 30 hari terakhir. Klik kartu untuk melihat seluruh timeline lab — badge menunjukkan update baru sejak kunjungan terakhir Anda.
        </p>
      </header>
      <LabGrid stats={stats} dates={dates} />
    </div>
  );
}
