import { createHash } from "node:crypto";

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", mdash: "—", ndash: "–",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", trade: "™", reg: "®", copy: "©",
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x10ffff ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** HTML → plain text (scripts/styles removed, entities decoded, whitespace collapsed). */
export function stripHtml(input: string): string {
  const withoutTags = input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, " ")
    .replace(/<\/?[a-z!][^>]*>/gi, " ");
  // Decode after stripping, then strip again in case the source double-encoded markup/entities.
  const once = decodeEntities(withoutTags).replace(/<\/?[a-z!][^>]*>/gi, " ");
  const twice = /&(#x?[0-9a-f]+|[a-z]+);/i.test(once) ? decodeEntities(once) : once;
  return twice.replace(/\s+/g, " ").trim();
}

export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  const cut = input.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
}

/**
 * Resolves `raw` (optionally against `base`) and returns it only if it is an absolute http(s) URL.
 * Anything else (javascript:, data:, tag:, garbage) returns null so the item is dropped.
 */
export function safeHttpUrl(raw: string | null | undefined, base?: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim(), base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const TRACKING_PARAMS = /^(utm_|ref$|ref_src$|source$|fbclid$|gclid$|mc_cid$|mc_eid$)/i;

/** Canonical URL used for identity: https, no hash, no tracking params, no trailing slash. */
export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    url.protocol = "https:";
    url.hostname = url.hostname.replace(/^www\./, "");
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
    }
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return raw.trim();
  }
}

export function shortHash(input: string, length = 16): string {
  return createHash("sha1").update(input).digest("hex").slice(0, length);
}

/** Parses RFC-822 / ISO dates. Returns null for missing/invalid dates — never invents a date. */
export function parseDate(input: unknown): Date | null {
  if (input == null || input === "") return null;
  if (typeof input === "number") {
    const d = new Date(input < 1e12 ? input * 1000 : input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(String(input).trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with", "by", "is", "are", "at", "from",
  "new", "now", "our", "we", "your", "you", "how", "its", "it", "as", "this", "that", "introducing", "announcing",
]);

export function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9.\s-]/g, " ")
      .split(/[\s-]+/)
      .map((t) => t.replace(/^\.+|\.+$/g, ""))
      .filter((t) => t.length > 1 && !STOPWORDS.has(t)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Checks a URL against official domains. Entries may be hostnames ("openai.com") or host+path ("github.com/openai"). */
export function isOfficialUrl(raw: string, domains: readonly string[]): boolean {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const hostPath = `${host}${url.pathname}`.toLowerCase();
    return domains.some((d) => {
      const dom = d.toLowerCase();
      if (dom.includes("/")) return hostPath === dom || hostPath.startsWith(`${dom}/`);
      return host === dom || host.endsWith(`.${dom}`);
    });
  } catch {
    return false;
  }
}

export function safeRegex(pattern: string | undefined): RegExp | null {
  if (!pattern) return null;
  try {
    return new RegExp(pattern, "i");
  } catch {
    return null;
  }
}

export function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 86_400_000);
}
