export interface SearchDoc {
  type: "lab" | "update" | "discover" | "deal";
  id: string;
  title: string;
  /** Secondary line (lab name, category, provider…). */
  sub: string;
  /** Lowercased extra searchable text. */
  text: string;
  /** Internal path ("/labs/openai") or external URL. */
  href: string;
  lab?: string;
  date?: string;
  /** Base ranking weight. */
  weight: number;
}
