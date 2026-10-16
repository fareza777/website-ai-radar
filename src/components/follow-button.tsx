"use client";

import { Star } from "lucide-react";
import { toggleFollow, useRadarState } from "@/lib/storage";
import { cn } from "@/lib/utils";

/** Follow a lab to build "My Radar" (stored in this browser only). */
export function FollowButton({ slug, name, variant = "icon", className }: { slug: string; name: string; variant?: "icon" | "pill"; className?: string }) {
  const following = useRadarState().follows.includes(slug);
  const label = following ? `Unfollow ${name}` : `Follow ${name}`;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFollow(slug);
      }}
      aria-pressed={following}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 text-muted-foreground transition focus-visible:ring-2 focus-visible:ring-ring",
        variant === "icon" ? "size-8 rounded-lg hover:bg-accent hover:text-foreground" : "h-9 rounded-lg border bg-surface/60 px-3 text-sm font-medium hover:border-foreground/20 hover:text-foreground",
        following && "text-amber-500 hover:text-amber-500",
        className,
      )}
    >
      <Star className={cn("size-4", following && "fill-current")} />
      {variant === "pill" && (following ? "Following" : "Follow")}
    </button>
  );
}
