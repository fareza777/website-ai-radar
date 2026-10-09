import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Activity } from "lucide-react";
import { GithubIcon } from "@/components/lab-logo";
import { CommandSearch } from "@/components/command-search";
import { MobileNav, SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme";
import { TimeAgo } from "@/components/time-ago";
import { getStatus } from "@/lib/data";
import { SITE, siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ["AI", "LLM", "OpenAI", "Anthropic", "Claude", "Gemini", "DeepSeek", "Qwen", "berita AI", "AI news Indonesia", "free credits", "AI tools"],
  openGraph: { type: "website", siteName: SITE.name, title: `${SITE.name} — ${SITE.tagline}`, description: SITE.description, locale: "id_ID" },
  twitter: { card: "summary_large_image", title: `${SITE.name} — ${SITE.tagline}`, description: SITE.description },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#121218" },
  ],
};

function SiteFooter() {
  const status = getStatus();
  const active = status ? status.sources.filter((s) => !s.skipped) : [];
  const ok = active.filter((s) => s.ok).length;
  return (
    <footer className="mt-16 border-t pb-24 md:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{SITE.name} · {SITE.tagline}</p>
          <p className="max-w-xl text-xs leading-relaxed">
            Data dikumpulkan otomatis dari blog, RSS, changelog, GitHub, dan Hugging Face resmi. Tidak ada berita, harga, atau promo yang dikarang —
            selalu cek sumber asli sebelum mengambil keputusan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {status && (
            <Link href="/status" className="inline-flex items-center gap-1.5 hover:text-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-emerald-500/60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <Activity className="size-3.5" />
              {ok}/{active.length} sumber OK · update <TimeAgo iso={status.generatedAt} />
            </Link>
          )}
          <a href={SITE.repo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <GithubIcon className="size-3.5" /> GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <div aria-hidden="true" className="bg-aurora pointer-events-none fixed inset-x-0 top-0 -z-10 h-[38rem]" />
          <div aria-hidden="true" className="bg-grid pointer-events-none fixed inset-x-0 top-0 -z-10 h-[30rem]" />
          <SiteHeader />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 sm:px-6 sm:pt-8">{children}</main>
          <SiteFooter />
          <MobileNav />
          <CommandSearch />
        </ThemeProvider>
      </body>
    </html>
  );
}
