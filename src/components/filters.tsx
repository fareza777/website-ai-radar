"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  className?: string;
}

export function Chip({ active, onClick, children, count, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[14px] font-medium transition",
        active
          ? "border-transparent bg-foreground text-background shadow-sm"
          : "bg-surface/60 text-muted-foreground hover:border-foreground/20 hover:text-foreground",
        className,
      )}
    >
      {children}
      {count != null && <span className={cn("tabular-nums text-[12.5px]", active ? "text-background/70" : "text-muted-foreground/80")}>{count}</span>}
    </button>
  );
}

export function ChipRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0", className)}>{children}</div>;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
}

export function Segmented<T extends string>({ value, onChange, options, ariaLabel }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex h-8 items-center rounded-lg border bg-surface/60 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-full rounded-md px-2.5 text-[13.5px] font-medium text-muted-foreground transition",
            value === o.value && "bg-accent text-foreground shadow-xs",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={cn("relative flex h-9 items-center", className)}>
      <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full rounded-lg border bg-surface/60 pl-9 pr-8 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="absolute right-2 rounded p-0.5 text-muted-foreground hover:text-foreground">
          <X className="size-3.5" />
        </button>
      )}
    </label>
  );
}

interface PaginationProps {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}

export function Pagination({ page, pages, onChange }: PaginationProps) {
  if (pages <= 1) return null;
  const nums: (number | "…")[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums.at(-1) !== "…") nums.push("…");
  }
  const btn = "inline-flex size-9 items-center justify-center rounded-lg border text-sm font-medium transition disabled:opacity-40";
  return (
    <nav className="mt-6 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <button type="button" className={cn(btn, "bg-surface/60 hover:bg-accent")} disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <ChevronLeft className="size-4" />
      </button>
      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn(btn, n === page ? "border-transparent bg-foreground text-background" : "bg-surface/60 hover:bg-accent")}
          >
            {n}
          </button>
        ),
      )}
      <button type="button" className={cn(btn, "bg-surface/60 hover:bg-accent")} disabled={page === pages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="card-surface flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
