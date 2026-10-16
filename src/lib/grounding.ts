const NUMBER_TOKEN = /[$€£]?\d[\d.,]*\s?(%|[kmb]\b)?/gi;

/**
 * Grounding guard: every number/price/percentage in generated text must appear in the source text.
 * Rejects hallucinated figures (and figures injected via prompt-injection in feed excerpts).
 * Shared by the collector's LLM step and by the website's Cursor-summary overlay.
 */
export function isGrounded(output: string, source: string): boolean {
  const src = source.toLowerCase().replace(/\s+/g, "");
  for (const m of output.toLowerCase().matchAll(NUMBER_TOKEN)) {
    const digits = m[0].replace(/[^\d.,]/g, "").replace(/[.,]+$/, "");
    if (digits && !src.includes(digits)) return false;
  }
  return true;
}

/** Small, stable, isomorphic content hash (FNV-1a, 32-bit hex) — used to detect that a source changed after summarizing. */
export function contentHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
