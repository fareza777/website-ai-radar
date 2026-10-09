"use client";

import { Bookmark } from "lucide-react";
import { toggleBookmark, useRadarState, type SavedEntry } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  entry: Omit<SavedEntry, "savedAt">;
  className?: string;
}

export function BookmarkButton({ entry, className }: BookmarkButtonProps) {
  const state = useRadarState();
  const saved = Boolean(state.bookmarks[entry.id]);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleBookmark(entry);
      }}
      aria-pressed={saved}
      aria-label={saved ? "Hapus dari Saved" : "Simpan"}
      title={saved ? "Hapus dari Saved" : "Simpan"}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        saved && "text-brand hover:text-brand",
        className,
      )}
    >
      <Bookmark className={cn("size-4", saved && "fill-current")} />
    </button>
  );
}
