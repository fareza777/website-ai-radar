"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Ellipsis, Search } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Kbd } from "./badges";
import { openSearch } from "./command-search";
import { isActive, MORE_LINKS, MOBILE_PRIMARY, NAV_ITEMS } from "./nav-items";
import { RadarMark } from "./radar-mark";
import { ThemeToggle } from "./theme";
import { useRadarState } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const saved = Object.keys(useRadarState().bookmarks).length;

  return (
    <header className="glass sticky top-0 z-40 border-b">
      <div className="site-container flex h-16 items-center gap-3">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="AI Radar — home">
          <RadarMark />
          <span className="flex flex-col leading-none">
            <span className="text-[20px] font-semibold tracking-[-0.04em]">AI Radar<span className="text-brand">.</span></span>
            <span className="mt-1 hidden font-mono text-[11px] tracking-[0.12em] text-muted-foreground sm:block">AI INTELLIGENCE HUB</span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-0.5 lg:flex xl:ml-4" aria-label="Main navigation">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-10 items-center gap-1.5 rounded-md px-2.5 text-[14px] font-medium text-muted-foreground transition hover:bg-subtle hover:text-foreground",
                  active && "bg-accent text-brand shadow-[inset_0_-2px_var(--brand)]",
                )}
              >
                <Icon className="size-4" />
                <span className={cn(!active && "hidden xl:inline")}>{label}</span>
                {href === "/saved" && saved > 0 && (
                  <span className="ml-0.5 rounded-full bg-brand/15 px-1.5 text-[13px] font-semibold text-brand tabular-nums">{saved}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={openSearch}
            className="inline-flex h-10 items-center gap-2 rounded-md border bg-surface/60 px-2.5 text-[13px] text-muted-foreground transition hover:border-foreground/20 hover:text-foreground sm:w-52 lg:w-10 lg:justify-center lg:px-0 xl:w-48 xl:justify-start xl:px-2.5"
            aria-label="Search (Ctrl+K)"
          >
            <Search className="size-4" />
            <span className="hidden truncate sm:inline lg:hidden xl:inline">Search intelligence…</span>
            <Kbd className="ml-auto hidden sm:inline-flex lg:hidden xl:inline-flex">⌘K</Kbd>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const primary = NAV_ITEMS.filter((n) => (MOBILE_PRIMARY as readonly string[]).includes(n.href));
  const moreActive = MORE_LINKS.some((l) => isActive(pathname, l.href));
  return (
    <>
      <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t lg:hidden" aria-label="Bottom navigation">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {primary.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex h-14 flex-col items-center justify-center gap-0.5 text-[14px] font-medium text-muted-foreground", active && "text-foreground")}
                >
                  <span className={cn("flex h-7 w-11 items-center justify-center rounded-full transition", active && "bg-brand/15 text-brand")}>
                    <Icon className="size-[18px]" />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMore(true)}
              aria-label="More pages"
              className={cn("flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[14px] font-medium text-muted-foreground", moreActive && "text-foreground")}
            >
              <span className={cn("flex h-7 w-11 items-center justify-center rounded-full transition", moreActive && "bg-brand/15 text-brand")}>
                <Ellipsis className="size-[18px]" />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>
      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
            <SheetDescription className="sr-only">Additional pages</SheetDescription>
          </SheetHeader>
          <ul className="grid grid-cols-2 gap-2 px-4">
            {MORE_LINKS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} onClick={() => setMore(false)} className="flex items-center gap-3 rounded-xl border bg-surface/60 p-3 text-[18px] font-medium">
                  <Icon className="size-5 text-brand" /> {label}
                </Link>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
