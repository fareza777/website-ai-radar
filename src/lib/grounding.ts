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
