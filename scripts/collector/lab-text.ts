import { LAB_ALIASES } from "../../src/config/signals";

const ALIAS_PATTERNS: { lab: string; re: RegExp }[] = Object.entries(LAB_ALIASES).flatMap(([lab, aliases]) =>
  aliases.map((a) => {
    const esc = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Whole word at the start; at the end too, unless the alias is a prefix by design ("seed-").
    return { lab, re: new RegExp(`(?<![a-z0-9])${esc}${/[a-z0-9]$/i.test(a) ? "(?![a-z0-9])" : ""}`, "i") };
  }),
);

/** Lab whose alias appears EARLIEST in the text (the headline's subject), matched as whole words. */
export function labFromText(text: string): string | undefined {
  let best: { lab: string; index: number } | undefined;
  for (const { lab, re } of ALIAS_PATTERNS) {
    const index = re.exec(text)?.index;
    if (index !== undefined && (!best || index < best.index)) best = { lab, index };
  }
  return best?.lab;
}
