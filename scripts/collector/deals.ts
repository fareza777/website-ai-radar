import { CURATED_DEALS, DEAL_SIGNALS } from "../../src/config/deals";
import type { Deal, SourceStatus, UpdateItem } from "../../src/lib/types";
import { errorMessage, fetchJson, fetchText, pool } from "./http";
import { dataPath, readJson, writeJson } from "./store";
import { daysAgo, normalizeUrl, parseDate, safeHttpUrl, safeRegex, shortHash, stripHtml, truncate } from "./text";

interface OpenRouterModel {
  id: string;
  name: string;
  created: number;
  description?: string;
  context_length?: number;
  pricing: { prompt: string; completion: string };
  expiration_date?: string | null;
}

/** Maps OpenRouter vendor prefixes to lab slugs. */
const OR_VENDOR: Record<string, string> = {
  openai: "openai", anthropic: "anthropic", google: "google-deepmind", "x-ai": "xai", deepseek: "deepseek",
  qwen: "qwen", moonshotai: "moonshot", "z-ai": "zai", "meta-llama": "meta", mistralai: "mistral",
  minimax: "minimax", cohere: "cohere", microsoft: "microsoft", amazon: "amazon", baidu: "baidu",
  tencent: "tencent", bytedance: "bytedance", "bytedance-seed": "bytedance", nvidia: "nvidia", ai21: "ai21", "ibm-granite": "ibm",
};

function evidenceAround(text: string, re: RegExp): string | null {
  const m = re.exec(text);
  if (!m) return null;
  const start = Math.max(0, m.index - 30);
  return truncate(`${start > 0 ? "…" : ""}${text.slice(start, m.index + m[0].length + 170).trim()}`, 240);
}

function isExpired(endsAt: string | null, now: Date): boolean {
  return !!endsAt && Date.parse(endsAt) < now.getTime();
}

async function curated(now: Date, prev: Map<string, Deal>, log: (m: string) => void): Promise<Deal[]> {
  const nowIso = now.toISOString();
  return pool(CURATED_DEALS, 4, async (c) => {
    const old = prev.get(c.id);
    const base = {
      id: c.id, title: c.title, provider: c.provider, kind: c.kind, description: c.description,
      terms: "Syarat lengkap & batas penggunaan mengikuti halaman resmi (lihat kutipan bukti).",
      url: c.url, sourceName: "Halaman resmi", startsAt: null, endsAt: c.endsAt ?? null,
      firstSeenAt: old?.firstSeenAt ?? nowIso, ...(c.lab ? { lab: c.lab } : {}),
    };
    try {
      const page = stripHtml(await fetchText(c.url, { browserUa: true, retries: 1 }));
      const evidence = evidenceAround(page, new RegExp(c.mustContain, "i"));
      if (!evidence) {
        log(`[deals] ? ${c.id}: evidence not found`);
        return { ...base, status: "unverified" as const, lastVerifiedAt: old?.lastVerifiedAt ?? null, evidence: old?.evidence };
      }
      return { ...base, status: isExpired(base.endsAt, now) ? ("expired" as const) : ("active" as const), lastVerifiedAt: nowIso, evidence };
    } catch (err) {
      log(`[deals] ✗ ${c.id}: ${errorMessage(err)}`);
      return { ...base, status: "unverified" as const, lastVerifiedAt: old?.lastVerifiedAt ?? null, evidence: old?.evidence };
    }
  });
}

async function openRouterFree(now: Date, prev: Map<string, Deal>): Promise<Deal[]> {
  const nowIso = now.toISOString();
  const res = await fetchJson<{ data: OpenRouterModel[] }>("https://openrouter.ai/api/v1/models");
  // Strict: price must be an explicit "0" string — missing/null/blank pricing is NOT free (Number(null) === 0).
  const isZero = (v: unknown) => typeof v === "string" && v.trim() !== "" && Number(v) === 0;
  const live = res.data.filter((m) => isZero(m.pricing?.prompt) && isZero(m.pricing?.completion) && !m.id.startsWith("openrouter/"));
  const liveIds = new Set<string>();
  const deals: Deal[] = live.flatMap((m) => {
    const created = parseDate(m.created);
    if (!created) return []; // malformed entry: skip the model, not the whole source
    const id = `openrouter-free-${shortHash(m.id, 10)}`;
    liveIds.add(id);
    const vendor = m.id.split("/")[0];
    const endsAt = m.expiration_date ? parseDate(m.expiration_date)?.toISOString() ?? null : null;
    return [{
      id,
      title: `${m.name.replace(/\s*\(free\)\s*$/i, "")} — gratis via OpenRouter`,
      provider: "OpenRouter",
      kind: "free-model" as const,
      description: truncate(stripHtml(m.description ?? ""), 220),
      terms: `Harga input & output $0 per token di OpenRouter${m.context_length ? ` · konteks ${m.context_length.toLocaleString("en-US")} token` : ""}. Model gratis memiliki batas rate harian.`,
      url: `https://openrouter.ai/${m.id}`,
      sourceName: "OpenRouter Models API",
      status: isExpired(endsAt, now) ? ("expired" as const) : ("active" as const),
      startsAt: created.toISOString(),
      endsAt,
      firstSeenAt: prev.get(id)?.firstSeenAt ?? nowIso,
      lastVerifiedAt: nowIso,
      evidence: `pricing.prompt = ${m.pricing.prompt}, pricing.completion = ${m.pricing.completion} (model id: ${m.id})`,
      ...(OR_VENDOR[vendor] ? { lab: OR_VENDOR[vendor] } : {}),
      meta: { modelId: m.id, ...(m.context_length ? { context: m.context_length } : {}) },
    } satisfies Deal];
  });
  // Previously free models that disappeared are kept as expired for 14 days (transparency).
  const cutoff = daysAgo(now, 14).toISOString();
  for (const old of prev.values()) {
    if (!old.id.startsWith("openrouter-free-") || liveIds.has(old.id)) continue;
    const endedAt = old.status === "expired" ? old.endsAt ?? old.lastVerifiedAt : old.lastVerifiedAt;
    if (endedAt && endedAt < cutoff) continue;
    deals.push({ ...old, status: "expired", endsAt: old.endsAt ?? old.lastVerifiedAt, terms: `${old.terms} Tidak lagi gratis/tersedia per pengecekan terakhir.` });
  }
  return deals;
}

function fromLabAnnouncements(items: UpdateItem[], now: Date, prev: Map<string, Deal>): Deal[] {
  const re = safeRegex(DEAL_SIGNALS.promoKeyword)!;
  const after = daysAgo(now, DEAL_SIGNALS.announcementTtlDays).toISOString();
  return items
    .filter((i) => i.publishedAt >= after && (i.category === "promo" || i.category === "pricing") && i.verified && re.test(i.title))
    .map((i) => {
      const id = `lab-${i.id}`;
      return {
        id,
        title: i.title,
        provider: i.sourceName,
        kind: i.category === "pricing" ? ("discount" as const) : ("promo" as const),
        description: i.summary,
        terms: "Diumumkan di kanal resmi lab. Tanggal berakhir tidak tercantum di feed — cek pengumuman untuk syarat.",
        url: i.url,
        sourceName: i.sourceName,
        status: "announced" as const,
        startsAt: i.publishedAt,
        endsAt: null,
        firstSeenAt: prev.get(id)?.firstSeenAt ?? now.toISOString(),
        lastVerifiedAt: null,
        evidence: truncate(i.excerpt, 240),
        lab: i.lab,
      };
    });
}

interface HnHit {
  objectID: string;
  title: string;
  url: string | null;
  points: number;
  created_at: string;
}

async function hnDeals(now: Date, prev: Map<string, Deal>): Promise<Deal[]> {
  const since = Math.floor(daysAgo(now, DEAL_SIGNALS.hackernews.lookbackDays).getTime() / 1000);
  const re = /(free|credits?|discount|% off|trial|cheaper|price)/i;
  const out = new Map<string, Deal>();
  for (const q of DEAL_SIGNALS.hackernews.queries) {
    const res = await fetchJson<{ hits: HnHit[] }>(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&numericFilters=created_at_i>${since},points>${DEAL_SIGNALS.hackernews.minPoints}&hitsPerPage=20`,
    );
    for (const h of res.hits) {
      const url = safeHttpUrl(h.url);
      if (!url || !re.test(h.title)) continue;
      const id = `hn-${h.objectID}`;
      out.set(id, {
        id,
        title: h.title,
        provider: new URL(url).hostname.replace(/^www\./, ""),
        kind: "promo",
        description: "Sinyal komunitas dari Hacker News — belum diverifikasi oleh AI Radar.",
        terms: "Belum diverifikasi. Pastikan syarat, harga, dan masa berlaku langsung di situs penyedia.",
        url: normalizeUrl(url),
        sourceName: `Hacker News · ${h.points} poin`,
        status: "unverified",
        startsAt: h.created_at,
        endsAt: null,
        firstSeenAt: prev.get(id)?.firstSeenAt ?? now.toISOString(),
        lastVerifiedAt: null,
        meta: { hn: `https://news.ycombinator.com/item?id=${h.objectID}`, points: h.points },
      });
    }
  }
  return [...out.values()];
}

export async function collectDeals(now: Date, allItems: UpdateItem[], log: (m: string) => void): Promise<{ deals: Deal[]; statuses: SourceStatus[] }> {
  const nowIso = now.toISOString();
  const prevList = readJson<Deal[]>(dataPath("deals.json"), []);
  const prev = new Map(prevList.map((d) => [d.id, d]));
  const prevStatus = readJson<{ sources?: SourceStatus[] }>(dataPath("status.json"), {}).sources ?? [];
  const statuses: SourceStatus[] = [];
  const deals: Deal[] = [];

  const track = async (id: string, name: string, target: string, fn: () => Promise<Deal[]>, fallbackPrefix: string) => {
    const base = { id, lab: "deals", name, type: "deals" as const, target, lastRunAt: nowIso };
    try {
      const list = await fn();
      deals.push(...list);
      statuses.push({ ...base, ok: true, lastSuccessAt: nowIso, lastError: null, fetched: list.length, accepted: list.length });
      log(`[deals] ✓ ${id} ${list.length}`);
    } catch (err) {
      // Source failed → keep previously known deals from it, unchanged (last valid state).
      deals.push(...prevList.filter((d) => d.id.startsWith(fallbackPrefix)));
      const old = prevStatus.find((s) => s.id === id);
      statuses.push({ ...base, ok: false, lastSuccessAt: old?.lastSuccessAt ?? null, lastError: errorMessage(err), fetched: 0, accepted: 0 });
      log(`[deals] ✗ ${id} ${errorMessage(err)}`);
    }
  };

  await track("deals-curated", "Program resmi (verifikasi halaman)", "src/config/deals.ts", () => curated(now, prev, log), "__none__");
  await track("deals-openrouter", "OpenRouter free models", "openrouter.ai/api/v1/models", () => openRouterFree(now, prev), "openrouter-free-");
  await track("deals-labs", "Pengumuman promo/harga dari lab", "data/updates", async () => fromLabAnnouncements(allItems, now, prev), "lab-");
  await track("deals-hn", "Hacker News (sinyal komunitas)", "hn.algolia.com", () => hnDeals(now, prev), "hn-");

  const rank: Record<Deal["status"], number> = { active: 0, announced: 1, unverified: 2, expired: 3 };
  deals.sort((a, b) => rank[a.status] - rank[b.status] || (b.startsAt ?? "").localeCompare(a.startsAt ?? ""));
  return { deals, statuses };
}

export function saveDeals(deals: Deal[]): boolean {
  return writeJson(dataPath("deals.json"), deals);
}
