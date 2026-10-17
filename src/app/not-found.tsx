import Link from "next/link";
import { ArrowRight, Bookmark, Boxes, Cpu, Gift, LayoutGrid, Newspaper, Radio, Telescope } from "lucide-react";
import { RadarMark } from "@/components/radar-mark";

const SECTIONS = [
  { href: "/", label: "Today", hint: "Daily briefing, live radar, and the global feed", icon: Radio },
  { href: "/labs", label: "AI Labs", hint: "Every lab's timeline and release rhythm", icon: LayoutGrid },
  { href: "/firehose", label: "Firehose", hint: "Official, press, social, papers, community", icon: Newspaper },
  { href: "/discover", label: "Discover", hint: "Tools, agents, and startups on the rise", icon: Telescope },
  { href: "/models", label: "Models & prices", hint: "Live pricing and every price move", icon: Cpu },
  { href: "/deals", label: "Deals & credits", hint: "Verified free tiers and promos", icon: Gift },
  { href: "/digest", label: "Weekly digest", hint: "The week in AI, in one page", icon: Boxes },
  { href: "/saved", label: "Saved", hint: "Your bookmarks, stored locally", icon: Bookmark },
];

export default function NotFound() {
  return (
    <div className="py-12 sm:py-16">
      <div className="flex flex-col items-center text-center">
        <RadarMark className="size-14 rounded-2xl" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Signal lost</h1>
        <p className="mt-2 text-sm text-muted-foreground">The page you are looking for is not on the radar. Try one of these instead.</p>
        <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-xl bg-foreground px-5 text-sm font-medium text-background">
          Back to Today
        </Link>
      </div>
      <ul className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map(({ href, label, hint, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="card-surface group flex h-full items-start gap-3 p-4 transition hover:border-brand/40">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"><Icon className="size-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-medium">
                  {label} <ArrowRight className="size-3.5 text-muted-foreground transition group-hover:translate-x-0.5" />
                </span>
                <span className="text-[13.5px] text-muted-foreground">{hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
