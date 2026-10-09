import { Bookmark, Compass, Cpu, Flame, Gift, LayoutGrid } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Today", icon: Flame },
  { href: "/labs", label: "AI Labs", icon: LayoutGrid },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/models", label: "Models", icon: Cpu },
  { href: "/deals", label: "Deals", icon: Gift },
  { href: "/saved", label: "Saved", icon: Bookmark },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
