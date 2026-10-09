import { CATEGORIES, type Category } from "../../src/lib/types";
import { errorMessage } from "./http";

/**
 * Optional LLM enrichment through any OpenAI-compatible Chat Completions endpoint
 * (OpenRouter, DeepSeek, Groq, Together, OpenAI…). The pipeline works fully without it.
 *
 * Env:
 *   LLM_API_KEY      required to enable
 *   LLM_BASE_URL     default https://openrouter.ai/api/v1
 *   LLM_MODEL        default deepseek/deepseek-v4-flash
 *   LLM_MAX_ITEMS    max items summarized per run (default 40) — caps cost
 */

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxItems: number;
}

export function llmConfig(): LlmConfig | null {
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.LLM_BASE_URL?.trim() || "https://openrouter.ai/api/v1").replace(/\/$/, ""),
    model: process.env.LLM_MODEL?.trim() || "deepseek/deepseek-v4-flash",
    maxItems: Math.max(0, Number(process.env.LLM_MAX_ITEMS ?? 40) || 0),
  };
}

async function chatJson(cfg: LlmConfig, system: string, user: string): Promise<unknown> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cfg.apiKey}`,
      "content-type": "application/json",
      "x-title": "AI Radar",
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content ?? "";
  const json = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
  return JSON.parse(json);
}

const SYSTEM_RULES = `Anda adalah editor berita AI berbahasa Indonesia untuk developer.
ATURAN KETAT:
- Hanya gunakan fakta yang ada di input. Jangan menambah angka, harga, tanggal, benchmark, atau klaim yang tidak tertulis.
- Jika informasi kurang, tulis ringkas dan umum; jangan menebak.
- Bahasa Indonesia yang natural, padat, tanpa hype. Nama produk/model tetap dalam bentuk aslinya.
- Keluarkan JSON valid saja.`;

export interface EnrichInput {
  id: string;
  lab: string;
  title: string;
  excerpt: string;
  source: string;
}

export interface Enriched {
  summary: string;
  benefit: string;
  category?: Category;
}

function clean(s: unknown, max: number): string | null {
  if (typeof s !== "string") return null;
  const t = s.replace(/\s+/g, " ").trim();
  return t.length >= 10 ? t.slice(0, max) : null;
}

const NUMBER_TOKEN = /[$€£]?\d[\d.,]*\s?(%|[kmb]\b)?/gi;

/**
 * Grounding guard: every number/price/percentage in the LLM output must appear in the source text.
 * Rejects hallucinated figures (and figures injected via prompt-injection in feed excerpts).
 */
export function isGrounded(output: string, source: string): boolean {
  const src = source.toLowerCase().replace(/\s+/g, "");
  for (const m of output.toLowerCase().matchAll(NUMBER_TOKEN)) {
    const digits = m[0].replace(/[^\d.,]/g, "").replace(/[.,]+$/, "");
    if (digits && !src.includes(digits)) return false;
  }
  return true;
}

/** Summarizes items in batches; failures are logged and skipped (templates remain). */
export async function enrichUpdates(cfg: LlmConfig, items: EnrichInput[], log: (m: string) => void): Promise<Map<string, Enriched>> {
  const out = new Map<string, Enriched>();
  const batchSize = 8;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const user = `Untuk setiap item, buat:
- "summary": ringkasan 1–2 kalimat (maks 260 karakter) tentang apa yang diumumkan.
- "benefit": 1 kalimat manfaat praktis bagi pengguna/developer (maks 200 karakter).
- "category": salah satu dari ${CATEGORIES.join(", ")}.
Format: {"items":[{"id":"...","summary":"...","benefit":"...","category":"..."}]}

ITEMS:
${JSON.stringify(batch)}`;
    try {
      const res = (await chatJson(cfg, SYSTEM_RULES, user)) as { items?: Record<string, unknown>[] };
      for (const r of res.items ?? []) {
        const id = typeof r.id === "string" ? r.id : null;
        const summary = clean(r.summary, 320);
        const benefit = clean(r.benefit, 240);
        const src = batch.find((b) => b.id === id);
        if (!id || !summary || !benefit || !src) continue;
        if (!isGrounded(`${summary} ${benefit}`, `${src.title} ${src.excerpt}`)) {
          log(`  ! LLM output for ${id} cites numbers not in source — keeping template`);
          continue;
        }
        const category = CATEGORIES.includes(r.category as Category) ? (r.category as Category) : undefined;
        out.set(id, { summary, benefit, category });
      }
    } catch (err) {
      log(`  ! LLM batch failed: ${errorMessage(err)}`);
    }
  }
  return out;
}

export interface DiscoverEnrichInput {
  id: string;
  name: string;
  description: string;
  topics: string[];
  url: string;
}

export interface DiscoverEnriched {
  summary: string;
  unique: string;
  benefit: string;
}

export async function enrichDiscover(
  cfg: LlmConfig,
  items: DiscoverEnrichInput[],
  log: (m: string) => void,
): Promise<Map<string, DiscoverEnriched>> {
  const out = new Map<string, DiscoverEnriched>();
  for (let i = 0; i < items.length; i += 8) {
    const batch = items.slice(i, i + 8);
    const user = `Untuk setiap produk/proyek AI, buat:
- "summary": fungsi utamanya (1 kalimat, maks 200 karakter)
- "unique": apa yang membedakannya, HANYA berdasarkan deskripsi/topik (maks 160 karakter)
- "benefit": manfaat praktis untuk developer/pengguna (maks 160 karakter)
Jangan menyebut harga kecuali tertulis di input.
Format: {"items":[{"id":"...","summary":"...","unique":"...","benefit":"..."}]}

ITEMS:
${JSON.stringify(batch)}`;
    try {
      const res = (await chatJson(cfg, SYSTEM_RULES, user)) as { items?: Record<string, unknown>[] };
      for (const r of res.items ?? []) {
        const id = typeof r.id === "string" ? r.id : null;
        const summary = clean(r.summary, 240);
        const unique = clean(r.unique, 200);
        const benefit = clean(r.benefit, 200);
        const src = batch.find((b) => b.id === id);
        if (id && summary && unique && benefit && src && isGrounded(`${summary} ${unique} ${benefit}`, `${src.name} ${src.description} ${src.topics.join(" ")}`)) {
          out.set(id, { summary, unique, benefit });
        }
      }
    } catch (err) {
      log(`  ! LLM discover batch failed: ${errorMessage(err)}`);
    }
  }
  return out;
}

export async function llmBriefing(
  cfg: LlmConfig,
  items: { id: string; lab: string; title: string; summary: string }[],
): Promise<{ headline: string; bullets: { text: string; itemId?: string }[] } | null> {
  const user = `Buat AI Daily Briefing berbahasa Indonesia dari daftar update berikut (sudah diurutkan dari paling penting).
- "headline": 1 kalimat rangkuman hari ini (maks 180 karakter)
- "bullets": 3–6 poin, masing-masing maks 200 karakter, sertakan "itemId" dari item yang dirujuk
Format: {"headline":"...","bullets":[{"text":"...","itemId":"..."}]}

UPDATES:
${JSON.stringify(items)}`;
  const res = (await chatJson(cfg, SYSTEM_RULES, user)) as { headline?: unknown; bullets?: { text?: unknown; itemId?: unknown }[] };
  const headline = clean(res.headline, 220);
  if (!headline || !Array.isArray(res.bullets)) return null;
  const source = JSON.stringify(items);
  if (!isGrounded(headline, source)) return null;
  const ids = new Set(items.map((i) => i.id));
  const bullets = res.bullets
    .map((b) => ({ text: clean(b.text, 240), itemId: typeof b.itemId === "string" && ids.has(b.itemId) ? b.itemId : undefined }))
    .filter((b): b is { text: string; itemId: string | undefined } => !!b.text && isGrounded(b.text, source))
    .slice(0, 6);
  return bullets.length ? { headline, bullets } : null;
}
