import type { Coverage } from "@/lib/types";
import { cn } from "@/lib/utils";

const META: Record<Coverage, { label: string; className: string; title: string }> = {
  full: { label: "Feed resmi", className: "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300", title: "Dipantau otomatis dari RSS/feed resmi + GitHub/Hugging Face" },
  mirror: { label: "Via mirror", className: "text-sky-700 bg-sky-500/10 dark:text-sky-300", title: "Lab tidak menyediakan RSS; blog resmi dipantau lewat mirror komunitas + GitHub/HF resmi" },
  partial: { label: "Parsial", className: "text-amber-700 bg-amber-500/10 dark:text-amber-300", title: "Tanpa blog/RSS resmi yang bisa dibaca mesin; dipantau dari Hugging Face & GitHub resmi" },
};

export function CoveragePill({ coverage, className }: { coverage: Coverage; className?: string }) {
  const m = META[coverage];
  return (
    <span title={m.title} className={cn("inline-flex h-5 items-center rounded-md px-1.5 text-[10.5px] font-medium", m.className, className)}>
      {m.label}
    </span>
  );
}
