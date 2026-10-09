"use client";

import { useSyncExternalStore } from "react";

/**
 * Per-browser personal state (bookmarks, read/unread, last visits) in localStorage.
 * Every access is guarded: private mode / blocked storage simply falls back to memory.
 */

export type SavedKind = "update" | "discover" | "deal";

export interface SavedEntry {
  id: string;
  kind: SavedKind;
  title: string;
  url: string;
  lab?: string;
  subtitle?: string;
  date: string;
  savedAt: string;
}

interface State {
  bookmarks: Record<string, SavedEntry>;
  read: string[];
  readAllBefore: string | null;
  labVisits: Record<string, string>;
  lastVisit: string | null;
}

const KEY = "ai-radar:v1";
const MAX_READ = 4000;
const EMPTY: State = { bookmarks: {}, read: [], readAllBefore: null, labVisits: {}, lastVisit: null };

let state: State = EMPTY;
let loaded = false;
let prevVisit: string | null = null;
let prevLabVisits: Record<string, string> = {};
const listeners = new Set<() => void>();

function readStorage(): State {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      bookmarks: parsed.bookmarks && typeof parsed.bookmarks === "object" ? parsed.bookmarks : {},
      read: Array.isArray(parsed.read) ? parsed.read.filter((x) => typeof x === "string") : [],
      readAllBefore: typeof parsed.readAllBefore === "string" ? parsed.readAllBefore : null,
      labVisits: parsed.labVisits && typeof parsed.labVisits === "object" ? parsed.labVisits : {},
      lastVisit: typeof parsed.lastVisit === "string" ? parsed.lastVisit : null,
    };
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = readStorage();
  // The previous session's visits drive "new since last visit"; then stamp this visit.
  prevVisit = state.lastVisit;
  prevLabVisits = { ...state.labVisits };
  commit({ ...state, lastVisit: new Date().toISOString() });
}

function commit(next: State) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable/full — keep in-memory state for this session
  }
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  ensureLoaded();
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = readStorage();
      for (const l of listeners) l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => EMPTY;

/** Returns EMPTY on the server and during hydration, then the real stored state. */
export function useRadarState(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getPrevVisit(): string | null {
  ensureLoaded();
  return prevVisit;
}

export function toggleBookmark(entry: Omit<SavedEntry, "savedAt">) {
  ensureLoaded();
  const bookmarks = { ...state.bookmarks };
  if (bookmarks[entry.id]) delete bookmarks[entry.id];
  else bookmarks[entry.id] = { ...entry, savedAt: new Date().toISOString() };
  commit({ ...state, bookmarks });
}

export function removeBookmark(id: string) {
  ensureLoaded();
  const { [id]: _removed, ...rest } = state.bookmarks;
  void _removed;
  commit({ ...state, bookmarks: rest });
}

export function markRead(id: string) {
  ensureLoaded();
  if (state.read.includes(id)) return;
  commit({ ...state, read: [...state.read, id].slice(-MAX_READ) });
}

export function markAllRead() {
  ensureLoaded();
  commit({ ...state, readAllBefore: new Date().toISOString() });
}

/** Lab visit recorded before this session started (stable for the whole session). */
export function getPrevLabVisit(slug: string): string | null {
  ensureLoaded();
  return prevLabVisits[slug] ?? null;
}

export function markLabVisited(slug: string) {
  ensureLoaded();
  commit({ ...state, labVisits: { ...state.labVisits, [slug]: new Date().toISOString() } });
}

export interface ReadIndex {
  ids: Set<string>;
  before: string | null;
}

export function readIndex(s: State): ReadIndex {
  return { ids: new Set(s.read), before: s.readAllBefore };
}

export function isRead(idx: ReadIndex, id: string, publishedAt: string): boolean {
  return (idx.before !== null && publishedAt <= idx.before) || idx.ids.has(id);
}
