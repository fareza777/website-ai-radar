import { Bookmark, Compass, Cpu, Flame, Gift, LayoutGrid, Newspaper, Radar, Rss, Send } from "lucide-react";

/** Main navigation (desktop header). */
export const NAV_ITEMS = [
  { href: "/", label: "Today", icon: Flame },
  { href: "/labs", label: "AI Labs", icon: LayoutGrid },
  { href: "/firehose", label: "Firehose", icon: Radar },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/models", label: "Models", icon: Cpu },
  { href: "/deals", label: "Deals", icon: Gift },
  { href: "/digest", label: "Digest", icon: Newspaper },
  { href: "/saved", label: "Saved", icon: Bookmark },
] as const;

/** Bottom bar on phones: the most used; the rest live in the "More" sheet. */
export const MOBILE_PRIMARY = ["/", "/labs", "/firehose", "/discover"] as const;

export const MORE_LINKS = [
  { href: "/models", label: "Models & prices", icon: Cpu },
  { href: "/deals", label: "Deals & credits", icon: Gift },
  { href: "/digest", label: "Weekly digest", icon: Newspaper },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/submit", label: "Send a tip", icon: Send },
  { href: "/status", label: "Status & coverage", icon: Rss },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
