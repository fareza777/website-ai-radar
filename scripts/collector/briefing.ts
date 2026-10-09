import { LAB_BY_SLUG } from "../../src/config/labs";
import type { Briefing, UpdateItem } from "../../src/lib/types";
import { errorMessage } from "./http";
import { llmBriefing, type LlmConfig } from "./llm";
import { dataPath, readJson, writeJson } from "./store";

const TZ = "Asia/Jakarta";
const KEEP_DAYS = 30;

export function jakartaDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export async function buildBriefing(
  all: UpdateItem[],
  now: Date,
  llm: LlmConfig | null,
  log: (m: string) => void,
): Promise<Briefing> {
  const h24 = now.getTime() - 86_400_000;
  const d7 = now.getTime() - 7 * 86_400_000;
  const last24 = all.filter((i) => Date.parse(i.publishedAt) >= h24);
  const last7 = all.filter((i) => Date.parse(i.publishedAt) >= d7);
  const stats = {
    updates24h: last24.length,
    labsActive24h: new Set(last24.map((i) => i.lab)).size,
    updates7d: last7.length,
    newModels7d: last7.filter((i) => i.category === "model").length,
  };

  // Prefer the last 24h; on quiet days fall back to the last 72h so the briefing is never empty.
  const window = last24.length >= 3 ? last24 : all.filter((i) => Date.parse(i.publishedAt) >= now.getTime() - 3 * 86_400_000);
  // Highest-ranked first, at most 2 per lab so one busy lab cannot fill the briefing.
  // Low-value items (tutorials, customer stories) are skipped when enough strong items exist.
  const MIN_IMPORTANCE = 50;
  const strong = window.filter((i) => i.importance >= MIN_IMPORTANCE);
  const pool = strong.length >= 4 ? strong : window;
  const perLab = new Map<string, number>();
  const top = [...pool]
    .sort((a, b) => b.importance - a.importance || b.publishedAt.localeCompare(a.publishedAt))
    .filter((i) => {
      const n = perLab.get(i.lab) ?? 0;
      if (n >= 2) return false;
      perLab.set(i.lab, n + 1);
      return true;
    })
    .slice(0, 12);
  const labName = (slug: string) => LAB_BY_SLUG[slug]?.name ?? slug;

  const base = { date: jakartaDate(now), generatedAt: now.toISOString(), stats };
  const template: Briefing = {
    ...base,
    source: "template",
    headline:
      last24.length >= 3
        ? `${stats.updates24h} update dari ${stats.labsActive24h} lab AI dalam 24 jam terakhir${stats.newModels7d ? ` · ${stats.newModels7d} rilis model dalam 7 hari` : ""}.`
        : `Hari yang relatif tenang — ini sorotan 72 jam terakhir dari ${new Set(window.map((i) => i.lab)).size} lab.`,
    bullets: top.slice(0, 6).map((i) => ({ text: `${labName(i.lab)}: ${i.title}`, itemId: i.id, lab: i.lab })),
  };

  if (!llm || top.length === 0) return template;
  try {
    const res = await llmBriefing(
      llm,
      top.map((i) => ({ id: i.id, lab: labName(i.lab), title: i.title, summary: i.summary })),
    );
    if (!res) return template;
    const labOf = new Map(top.map((i) => [i.id, i.lab]));
    return {
      ...base,
      source: "llm",
      headline: res.headline,
      bullets: res.bullets.map((b) => ({ text: b.text, ...(b.itemId ? { itemId: b.itemId, lab: labOf.get(b.itemId) } : {}) })),
    };
  } catch (err) {
    log(`[briefing] LLM failed, using template: ${errorMessage(err)}`);
    return template;
  }
}

/** Stores one briefing per Jakarta date (latest run of the day wins), newest first. */
export function saveBriefing(b: Briefing): boolean {
  const file = dataPath("briefings.json");
  const list = readJson<Briefing[]>(file, []).filter((x) => x.date !== b.date);
  const next = [b, ...list].sort((x, y) => y.date.localeCompare(x.date)).slice(0, KEEP_DAYS);
  return writeJson(file, next);
}
