import type { Category, DealStatus, DiscoverKind } from "./types";

export const CATEGORY_META: Record<Category, { label: string; className: string; dot: string }> = {
  model: { label: "Model", className: "text-violet-700 bg-violet-500/10 border-violet-500/20 dark:text-violet-300", dot: "bg-violet-500" },
  feature: { label: "Feature", className: "text-sky-700 bg-sky-500/10 border-sky-500/20 dark:text-sky-300", dot: "bg-sky-500" },
  api: { label: "API", className: "text-cyan-700 bg-cyan-500/10 border-cyan-500/20 dark:text-cyan-300", dot: "bg-cyan-500" },
  pricing: { label: "Pricing", className: "text-amber-700 bg-amber-500/10 border-amber-500/25 dark:text-amber-300", dot: "bg-amber-500" },
  promo: { label: "Promo", className: "text-pink-700 bg-pink-500/10 border-pink-500/20 dark:text-pink-300", dot: "bg-pink-500" },
  research: { label: "Research", className: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-300", dot: "bg-emerald-500" },
  developer: { label: "Developer", className: "text-slate-700 bg-slate-500/10 border-slate-500/20 dark:text-slate-300", dot: "bg-slate-400" },
};

export const DEAL_STATUS_META: Record<DealStatus, { label: string; className: string; hint: string }> = {
  active: { label: "Active · verified", className: "text-emerald-700 bg-emerald-500/10 border-emerald-500/25 dark:text-emerald-300", hint: "Evidence found on the official source at the last check." },
  announced: { label: "Officially announced", className: "text-sky-700 bg-sky-500/10 border-sky-500/25 dark:text-sky-300", hint: "Announced on an official channel; validity period not verified." },
  unverified: { label: "Unverified", className: "text-amber-700 bg-amber-500/10 border-amber-500/25 dark:text-amber-300", hint: "Community signal, or the official page could not be checked." },
  expired: { label: "Expired", className: "text-muted-foreground bg-muted border-border", hint: "Ended or no longer available." },
};

export const DISCOVER_KIND_LABEL: Record<DiscoverKind, string> = {
  github: "GitHub",
  product: "Product Hunt",
  "show-hn": "Show HN",
  api: "API",
};

/** Items at or above this score count as "Important". */
export const IMPORTANT_THRESHOLD = 65;
