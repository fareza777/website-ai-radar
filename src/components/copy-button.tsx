"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ text, label = "Copy as Markdown" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          // clipboard blocked: nothing to do
        }
      }}
      className="inline-flex h-9 items-center gap-2 rounded-lg border bg-surface/60 px-3 text-sm font-medium transition hover:border-foreground/20"
    >
      {done ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
      {done ? "Copied" : label}
    </button>
  );
}
