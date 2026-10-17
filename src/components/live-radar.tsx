"use client";

import { useState } from "react";
import { ArrowUpRight, Radio } from "lucide-react";
import { LAB_BY_SLUG } from "@/config/labs";
import type { Category } from "@/lib/types";
import { extHref } from "@/lib/url";
import { cn } from "@/lib/utils";
import { nearestRadarSignal } from "@/lib/radar";
import { CategoryBadge } from "./badges";
import { LabLogo } from "./lab-logo";
import { TimeAgo } from "./time-ago";

export interface RadarBlip {
  id: string;
  lab: string;
  title: string;
  url: string;
  category: Category;
  importance: number;
  publishedAt: string;
  /** Clockwise from 12 o'clock, degrees. */
  angle: number;
  /** 0 (center = now) … 1 (edge = window start). */
  radius: number;
}

export interface RadarSector {
  lab: string;
  angle: number;
}

const SWEEP_SECONDS = 6;

function polar(angle: number, radius: number): { left: string; top: string } {
  const rad = (angle * Math.PI) / 180;
  // Pin precision so server serialization and client calculations produce identical CSS.
  return { left: `${(50 + radius * 50 * Math.sin(rad)).toFixed(4)}%`, top: `${(50 - radius * 50 * Math.cos(rad)).toFixed(4)}%` };
}

/** Animated radar: each blip is a real update; distance from center = age, sector = lab. */
export function LiveRadar({ blips, sectors, windowHours }: { blips: RadarBlip[]; sectors: RadarSector[]; windowHours: number }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = blips.find((b) => b.id === activeId) ?? blips[0];
  const activeLab = active ? LAB_BY_SLUG[active.lab] : undefined;

  function selectPointer(clientX: number, clientY: number, canvas: HTMLDivElement) {
    const bounds = canvas.getBoundingClientRect();
    const id = nearestRadarSignal(blips, clientX - bounds.left, clientY - bounds.top, bounds.width, bounds.height);
    if (id) setActiveId(id);
  }

  return (
    <section aria-label="Live radar of the latest AI lab updates" className="card-surface radar-panel relative flex h-full min-w-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Radio className="size-4 text-brand" /> Signal radar
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded border border-brand/20 bg-brand/8 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-brand"><span className="size-1 rounded-full bg-brand" />{windowHours}h window</span>
      </div>
      <p className="mt-1.5 text-[13px] text-muted-foreground">{blips.length} real updates. Select a signal to explore.</p>
      <div
        className="radar-canvas"
        onPointerMove={(event) => {
          if (event.pointerType !== "touch") selectPointer(event.clientX, event.clientY, event.currentTarget);
        }}
        onClickCapture={(event) => {
          if (event.detail === 0) return;
          // Choose the visible dot closest to the pointer when touch targets overlap.
          selectPointer(event.clientX, event.clientY, event.currentTarget);
          event.stopPropagation();
        }}
      >
        {/* rings + crosshair */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full text-foreground" aria-hidden="true">
          <defs>
            <radialGradient id="radar-bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.02" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="49.5" fill="url(#radar-bg)" stroke="currentColor" strokeOpacity="0.22" strokeWidth="0.3" />
          {[0.33, 0.66].map((r) => (
            <circle key={r} cx="50" cy="50" r={49.5 * r} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.25" strokeDasharray="0.8 1.2" />
          ))}
          <line x1="50" y1="0.5" x2="50" y2="99.5" stroke="currentColor" strokeOpacity="0.07" strokeWidth="0.25" />
          <line x1="0.5" y1="50" x2="99.5" y2="50" stroke="currentColor" strokeOpacity="0.07" strokeWidth="0.25" />
          <text x="51.2" y="34" fontSize="2.6" fill="currentColor" fillOpacity="0.35">{Math.round(windowHours / 3)}h</text>
          <text x="51.2" y="17.6" fontSize="2.6" fill="currentColor" fillOpacity="0.35">{Math.round((windowHours * 2) / 3)}h</text>
        </svg>

        {/* sweep */}
        <div
          aria-hidden="true"
          className="absolute inset-[1%] rounded-full motion-safe:animate-[sweep_var(--sweep)_linear_infinite]"
          style={{
            ["--sweep" as string]: `${SWEEP_SECONDS}s`,
            background: "conic-gradient(from 0deg, transparent 0deg, transparent 290deg, color-mix(in oklch, var(--brand) 24%, transparent) 358deg, color-mix(in oklch, var(--brand) 60%, transparent) 360deg)",
          }}
        />

        {/* lab sectors */}
        {sectors.map((s) => {
          const lab = LAB_BY_SLUG[s.lab];
          if (!lab) return null;
          return (
            <span key={s.lab} className="absolute -translate-x-1/2 -translate-y-1/2 opacity-85" style={polar(s.angle, 1.08)} title={lab.name}>
              <LabLogo logo={lab.logo} name={lab.name} tile={false} className="size-4 [&>span]:size-4" />
            </span>
          );
        })}

        {/* blips */}
        {blips.map((b) => {
          const size = 4 + Math.round((b.importance / 100) * 7);
          const delay = (b.angle / 360) * SWEEP_SECONDS;
          const isActive = active?.id === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onFocus={(event) => {
                if (event.currentTarget.matches(":focus-visible")) setActiveId(b.id);
              }}
              onClick={() => setActiveId(b.id)}
              aria-label={`${LAB_BY_SLUG[b.lab]?.name ?? b.lab}: ${b.title}`}
              className="absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-brand"
              aria-pressed={isActive}
              style={polar(b.angle, b.radius)}
            >
              <span
                className={cn("block rounded-full bg-brand text-brand motion-safe:animate-[blip_var(--sweep)_linear_infinite]", isActive && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}
                style={{ width: size, height: size, ["--sweep" as string]: `${SWEEP_SECONDS}s`, animationDelay: `${delay.toFixed(4)}s`, boxShadow: "0 0 7px 0 currentColor" }}
              />
            </button>
          );
        })}
        <span aria-hidden="true" className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_12px_var(--brand)]" />
      </div>
      <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>Center = newest</span><span>Edge = {windowHours}h ago</span></div>
      {active && (
        <a
          href={extHref(active.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="radar-selection group"
          aria-live="polite"
        >
          {activeLab && <LabLogo logo={activeLab.logo} name={activeLab.name} size="sm" />}
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
              <span className="font-medium text-foreground">{activeLab?.name}</span>
              <CategoryBadge category={active.category} />
              <TimeAgo iso={active.publishedAt} />
            </span>
            <span className="mt-1.5 line-clamp-3 block text-base font-medium leading-snug group-hover:underline">{active.title}</span>
          </span>
          <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
        </a>
      )}
      {!active && <p className="radar-selection text-xs text-muted-foreground">No updates in this window. Explore the global feed for earlier releases.</p>}
    </section>
  );
}
