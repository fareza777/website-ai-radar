import { BadgeCheck, Copy, ShieldAlert } from "lucide-react";
import { CATEGORY_META } from "@/lib/categories";
import type { Category, Trust } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  const meta = CATEGORY_META[category];
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-[11px] font-medium", meta.className, className)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

/** Verification status: official link vs mirrored source vs unverified link. */
export function VerifyBadge({ verified, trust }: { verified: boolean; trust: Trust }) {
  if (verified && trust === "official") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title="Links to the lab's official domain/org and comes from an official feed">
        <BadgeCheck className="size-3.5" />
        Official
      </span>
    );
  }
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400" title="Links to the lab's official domain; tracked via a community mirror because the lab has no RSS">
        <Copy className="size-3.5" />
        Official · via mirror
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400" title="Link does not point to the lab's official domain">
      <ShieldAlert className="size-3.5" />
      Unverified
    </span>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cn("pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground", className)}>
      {children}
    </kbd>
  );
}
