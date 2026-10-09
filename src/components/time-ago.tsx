"use client";

import { useNow } from "@/hooks/use-now";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TimeAgoProps {
  iso: string;
  className?: string;
  /** Show absolute date beyond this many days (default 7). */
  relativeDays?: number;
}

/** Renders a deterministic absolute date on the server, switches to relative time after mount. */
export function TimeAgo({ iso, className, relativeDays = 7 }: TimeAgoProps) {
  const now = useNow();
  const useRelative = now !== null && Math.abs(now - Date.parse(iso)) < relativeDays * 86_400_000;
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className={cn("tabular-nums", className)} suppressHydrationWarning>
      {useRelative ? relativeTime(iso, now) : formatDate(iso)}
    </time>
  );
}
