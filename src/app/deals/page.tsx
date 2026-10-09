import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { DealsView } from "@/components/deals-view";
import { getDeals } from "@/lib/data";

export const metadata: Metadata = {
  title: "Deals & Free Credits",
  description: "Free tier, free credits, model gratis, trial, dan diskon API AI — dengan status verifikasi, kutipan bukti dari sumber resmi, dan tanggal berlaku.",
  alternates: { canonical: "/deals" },
};

export default function DealsPage() {
  const deals = getDeals();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand">Deals & Free Credits</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Promo, free tier & model gratis — terverifikasi</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Setiap deal menampilkan status, sumber, dan tanggal verifikasi terakhir. Status “aktif” hanya diberikan bila bukti ditemukan di sumber resmi saat pengecekan.
        </p>
        <p className="mt-3 inline-flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <ShieldAlert className="mt-px size-4 shrink-0" />
          AI Radar tidak pernah menganggap promo masih aktif tanpa verifikasi. Syarat bisa berubah sewaktu-waktu — selalu baca halaman resmi sebelum mendaftar.
        </p>
      </header>
      <DealsView deals={deals} />
    </div>
  );
}
