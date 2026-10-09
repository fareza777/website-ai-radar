"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Kbd } from "./badges";
import { openSearch } from "./command-search";
import { isActive, NAV_ITEMS } from "./nav-items";
import { RadarMark } from "./radar-mark";
import { ThemeToggle } from "./theme";
import { useRadarState } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const saved = Object.keys(useRadarState().bookmarks).length;

  return (
    <header className="glass sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="AI Radar — beranda">
          <RadarMark />
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight">AI Radar</span>
            <span className="hidden text-[10.5px] text-muted-foreground sm:block">Your AI Intelligence Hub</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-0.5 md:flex" aria-label="Navigasi utama">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground",
                  active && "bg-accent text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
                {href === "/saved" && saved > 0 && (
                  <span className="ml-0.5 rounded-full bg-brand/15 px-1.5 text-[10px] font-semibold text-brand tabular-nums">{saved}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={openSearch}
            className="inline-flex h-9 items-center gap-2 rounded-lg border bg-surface/60 px-2.5 text-sm text-muted-foreground transition hover:border-foreground/20 hover:text-foreground sm:w-60"
            aria-label="Cari (Ctrl+K)"
          >
            <Search className="size-4" />
            <span className="hidden sm:inline">Cari update, lab, tools…</span>
            <Kbd className="ml-auto hidden sm:inline-flex">⌘K</Kbd>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t md:hidden" aria-label="Navigasi bawah">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-14 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium text-muted-foreground", active && "text-foreground")}
              >
                <span className={cn("flex h-7 w-11 items-center justify-center rounded-full transition", active && "bg-brand/15 text-brand")}>
                  <Icon className="size-[18px]" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
