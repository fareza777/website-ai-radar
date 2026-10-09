import type { Coverage } from "@/lib/types";
import { cn } from "@/lib/utils";

const META: Record<Coverage, { label: string; className: string; title: string }> = {
  full: { label: "Official feed", className: "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300", title: "Tracked automatically from official RSS/feeds + GitHub/Hugging Face" },
  mirror: { label: "Via mirror", className: "text-sky-700 bg-sky-500/10 dark:text-sky-300", title: "The lab has no RSS; its official blog is tracked via a community mirror + official GitHub/HF" },
  partial: { label: "Partial", className: "text-amber-700 bg-amber-500/10 dark:text-amber-300", title: "No machine-readable official blog/RSS; tracked via official Hugging Face & GitHub" },
};

export function CoveragePill({ coverage, className }: { coverage: Coverage; className?: string }) {
  const m = META[coverage];
  return (
    <span title={m.title} className={cn("inline-flex h-5 items-center rounded-md px-1.5 text-[10.5px] font-medium", m.className, className)}>
      {m.label}
    </span>
  );
}
