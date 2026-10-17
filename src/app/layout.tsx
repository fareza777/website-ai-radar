import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Activity } from "lucide-react";
import { GithubIcon } from "@/components/lab-logo";
import { CommandSearch } from "@/components/command-search";
import { MobileNav, SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme";
import { TimeAgo } from "@/components/time-ago";
import { LABS } from "@/config/labs";
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
  keywords: ["AI", "LLM", "OpenAI", "Anthropic", "Claude", "Gemini", "DeepSeek", "Qwen", "AI news", "AI labs tracker", "free credits", "AI tools"],
  openGraph: { type: "website", url: "/", siteName: SITE.name, title: `${SITE.name} — ${SITE.tagline}`, description: SITE.description, locale: "en_US" },
  twitter: { card: "summary_large_image", title: `${SITE.name} — ${SITE.tagline}`, description: SITE.description },
  alternates: { canonical: "/", types: { "application/atom+xml": "/feed.xml", "application/feed+json": "/feed.json" } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#121218" },
  ],
};

const FOOTER_LINKS = [
  { href: "/", label: "Today" },
  { href: "/labs", label: "AI Labs" },
  { href: "/discover", label: "Discover" },
  { href: "/deals", label: "Deals & credits" },
  { href: "/models", label: "Models & prices" },
  { href: "/digest", label: "Weekly digest" },
  { href: "/firehose", label: "Firehose" },
  { href: "/status", label: "Status" },
  { href: "/submit", label: "Send a tip" },
];

function SiteFooter() {
  const status = getStatus();
  const active = status ? status.sources.filter((s) => !s.skipped) : [];
  const ok = active.filter((s) => s.ok).length;
  return (
    <footer className="mt-16 border-t pb-24 lg:pb-8">
      {/* Sitewide internal links: every section and lab is two clicks from anywhere (crawlable, and handy for visitors). */}
      <nav aria-label="Footer" className="mx-auto grid max-w-[1760px] 4xl:max-w-[2200px] gap-8 px-4 pt-8 text-sm sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] 2xl:px-10">
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground">Explore</h2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-muted-foreground">
            {FOOTER_LINKS.map((l) => (
              <li key={l.href}><Link href={l.href} className="hover:text-foreground hover:underline">{l.label}</Link></li>
            ))}
            <li><a href="/feed.xml" className="hover:text-foreground hover:underline">Atom feed</a></li>
            <li><a href="/feed.json" className="hover:text-foreground hover:underline">JSON feed</a></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground">AI labs</h2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-muted-foreground sm:grid-cols-3 lg:grid-cols-4">
            {LABS.map((l) => (
              <li key={l.slug}><Link href={`/labs/${l.slug}`} prefetch={false} className="hover:text-foreground hover:underline">{l.name}</Link></li>
            ))}
          </ul>
        </div>
      </nav>
      <div className="mx-auto flex max-w-[1760px] 4xl:max-w-[2200px] flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6 2xl:px-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{SITE.name} · {SITE.tagline}</p>
          <p className="max-w-xl text-xs leading-relaxed">
            Collected automatically from official blogs, RSS feeds, changelogs, GitHub, and Hugging Face. No news, prices, or promos are made up —
            always check the original source before making decisions.
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
              {ok}/{active.length} sources OK · updated <TimeAgo iso={status.generatedAt} />
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <div aria-hidden="true" className="bg-aurora pointer-events-none fixed inset-x-0 top-0 -z-10 h-[38rem]" />
          <div aria-hidden="true" className="bg-grid pointer-events-none fixed inset-x-0 top-0 -z-10 h-[30rem]" />
          <SiteHeader />
          <main className="mx-auto w-full max-w-[1760px] 4xl:max-w-[2200px] flex-1 px-4 pt-6 sm:px-6 sm:pt-8 2xl:px-10">{children}</main>
          <SiteFooter />
          <MobileNav />
          <CommandSearch />
        </ThemeProvider>
      </body>
    </html>
  );
}
