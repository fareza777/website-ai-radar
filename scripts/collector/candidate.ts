import type { DiscoverKind, Signal, XQuote } from "../../src/lib/types";

/** A Discover candidate before it is merged with history (shared by discover.ts and buzz.ts). */
export interface Candidate {
  key: string;
  name: string;
  url: string;
  repo?: string;
  kind: DiscoverKind;
  description: string;
  /** Creation/launch date when known; for websites this is the first public sighting (see dateKind). */
  createdAt: string | null;
  dateKind?: "created" | "spotted";
  stars?: number;
  language?: string | null;
  license?: string | null;
  topics?: string[];
  signals: Signal[];
  quote?: XQuote;
}
