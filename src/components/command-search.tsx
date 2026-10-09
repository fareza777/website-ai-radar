"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Compass, Gift, LayoutGrid, Loader2, Newspaper } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LAB_BY_SLUG } from "@/config/labs";
import { useDebounced } from "@/hooks/use-debounced";
import { formatDate } from "@/lib/format";
import { markRead } from "@/lib/storage";
import type { SearchDoc } from "@/lib/search-types";
import { LabLogo } from "./lab-logo";
import { isHttpUrl, isInternalPath } from "@/lib/url";

const OPEN_EVENT = "ai-radar:open-search";

export function openSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

let indexPromise: Promise<SearchDoc[]> | null = null;
function loadIndex(): Promise<SearchDoc[]> {
  indexPromise ??= fetch("/search-index.json")
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<SearchDoc[]>;
    })
    .catch((err: unknown) => {
      indexPromise = null; // allow a retry on next open
      throw err;
    });
  return indexPromise;
}

function search(docs: SearchDoc[], query: string): SearchDoc[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const scored: { d: SearchDoc; s: number }[] = [];
  for (const d of docs) {
    const title = d.title.toLowerCase();
    const hay = `${title} ${d.text}`;
    if (!terms.every((t) => hay.includes(t))) continue;
    let s = d.weight;
    for (const t of terms) if (title.includes(t)) s += title.startsWith(t) ? 30 : 15;
    scored.push({ d, s });
  }
  return scored.sort((a, b) => b.s - a.s || (b.d.date ?? "").localeCompare(a.d.date ?? "")).slice(0, 40).map((x) => x.d);
}

const GROUPS: { type: SearchDoc["type"]; label: string; icon: typeof Newspaper }[] = [
  { type: "lab", label: "AI Labs", icon: LayoutGrid },
  { type: "update", label: "Update", icon: Newspaper },
  { type: "discover", label: "Discover", icon: Compass },
  { type: "deal", label: "Deals", icon: Gift },
];

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [indexError, setIndexError] = useState(false);
  const q = useDebounced(query, 120);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !/input|textarea|select/i.test((e.target as HTMLElement)?.tagName ?? "")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open && !docs) loadIndex().then(setDocs, () => setIndexError(true));
  }, [open, docs]);

  const results = useMemo(() => (docs ? search(docs, q) : []), [docs, q]);

  const go = (d: SearchDoc) => {
    setOpen(false);
    if (isInternalPath(d.href)) {
      router.push(d.href);
      return;
    }
    if (!isHttpUrl(d.href)) return;
    if (d.type === "update") markRead(d.id);
    window.open(d.href, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[12%] translate-y-0 overflow-hidden p-0 sm:max-w-2xl" showCloseButton={false}>
        <DialogTitle className="sr-only">Pencarian global</DialogTitle>
        <DialogDescription className="sr-only">Cari update lab, tools di Discover, dan deals.</DialogDescription>
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          <CommandInput value={query} onValueChange={setQuery} placeholder="Cari model, lab, tool, promo…  (mis. “claude opus”, “free”, “mcp”)" className="h-12" />
          <CommandList className="max-h-[min(65vh,520px)]">
            {!docs && !indexError && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Memuat indeks…
              </div>
            )}
            {!docs && indexError && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Indeks pencarian gagal dimuat.{" "}
                <button type="button" className="font-medium text-foreground underline" onClick={() => { setIndexError(false); loadIndex().then(setDocs, () => setIndexError(true)); }}>
                  Coba lagi
                </button>
              </div>
            )}
            {docs && q && <CommandEmpty>Tidak ada hasil untuk “{q}”.</CommandEmpty>}
            {docs && !q && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Ketik untuk mencari di {docs.length.toLocaleString("id-ID")} entri · tekan <span className="font-mono">/</span> atau <span className="font-mono">⌘K</span> kapan saja
              </div>
            )}
            {GROUPS.map(({ type, label, icon: Icon }) => {
              const list = results.filter((r) => r.type === type).slice(0, type === "update" ? 20 : 8);
              if (!list.length) return null;
              return (
                <CommandGroup key={type} heading={label}>
                  {list.map((d) => {
                    const lab = d.lab ? LAB_BY_SLUG[d.lab] : undefined;
                    return (
                      <CommandItem key={`${d.type}-${d.id}`} value={`${d.type}-${d.id}`} onSelect={() => go(d)} className="gap-3 py-2.5">
                        {lab ? <LabLogo logo={lab.logo} name={lab.name} size="sm" /> : <span className="flex size-7 items-center justify-center rounded-lg border"><Icon className="size-4 text-muted-foreground" /></span>}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{d.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {d.sub}
                            {d.date ? ` · ${formatDate(d.date)}` : ""}
                          </span>
                        </span>
                        {!isInternalPath(d.href) && <ArrowUpRight className="size-4 text-muted-foreground" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
