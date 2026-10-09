import { cn } from "@/lib/utils";

/** Animated brand mark: concentric rings with a rotating sweep. */
export function RadarMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-8 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-brand to-brand-2 shadow-[0_0_24px_-6px_var(--brand)]", className)}>
      <svg viewBox="0 0 32 32" className="absolute inset-0 size-full text-white/80" aria-hidden="true">
        <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1" />
        <circle cx="16" cy="16" r="6.5" fill="none" stroke="currentColor" strokeOpacity=".5" strokeWidth="1" />
        <circle cx="16" cy="16" r="1.8" fill="currentColor" />
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 animate-sweep"
        style={{ background: "conic-gradient(from 0deg, transparent 0deg, rgb(255 255 255 / 0.55) 40deg, transparent 70deg)" }}
      />
      <span aria-hidden="true" className="absolute right-[7px] top-[8px] size-1.5 rounded-full bg-white shadow-[0_0_6px_white]" />
    </span>
  );
}
