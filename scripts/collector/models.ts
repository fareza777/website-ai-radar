import type { ModelEntry, PriceMove, SourceStatus } from "../../src/lib/types";
import { OR_VENDOR } from "./deals";
import { errorMessage, fetchJson } from "./http";
import { dataPath, readJson, writeJson } from "./store";
import { parseDate, shortHash } from "./text";

interface OpenRouterModel {
  id: string;
  name: string;
  created?: number;
  context_length?: number | null;
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  pricing?: { prompt?: unknown; completion?: unknown };
}

const MOVES_KEEP_DAYS = 90;
const HISTORY_MAX = 40;
/** Ignore float noise; a real price change is at least this relative difference. */
const MIN_CHANGE = 0.005;

/** USD per token string → USD per 1M tokens. null when the API gives no explicit numeric price. */
export function perMillion(v: unknown): number | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null; // OpenRouter uses -1 for "variable" router pricing
  return Math.round(n * 1e6 * 1e6) / 1e6;
}

export async function collectModels(now: Date, log: (m: string) => void): Promise<{ models: ModelEntry[]; moves: PriceMove[]; status: SourceStatus }> {
  const nowIso = now.toISOString();
  const prevModels = readJson<ModelEntry[]>(dataPath("models.json"), []);
  const prevMoves = readJson<PriceMove[]>(dataPath("price-moves.json"), []);
  const prevStatus = readJson<{ sources?: SourceStatus[] }>(dataPath("status.json"), {}).sources?.find((s) => s.id === "models-openrouter");
  const base = { id: "models-openrouter", lab: "models", name: "OpenRouter models & pricing", type: "deals" as const, target: "openrouter.ai/api/v1/models", lastRunAt: nowIso };

  try {
    const res = await fetchJson<{ data: OpenRouterModel[] }>("https://openrouter.ai/api/v1/models");
    const prevById = new Map(prevModels.map((m) => [m.id, m]));
    const moves: PriceMove[] = [];
    const models: ModelEntry[] = [];

    for (const m of res.data) {
      if (m.id.startsWith("openrouter/") || m.id.endsWith(":batch")) continue;
      const prompt = perMillion(m.pricing?.prompt);
      const completion = perMillion(m.pricing?.completion);
      if (prompt === null || completion === null) continue; // no verifiable price → not listed
      const prev = prevById.get(m.id);
      const history = [...(prev?.history ?? [])];
      const last = history.at(-1);
      if (!last || last.prompt !== prompt || last.completion !== completion) history.push({ at: nowIso, prompt, completion });

      if (prev) {
        for (const field of ["prompt", "completion"] as const) {
          const from = prev[field];
          const to = field === "prompt" ? prompt : completion;
          if (from === to || (from === 0 && to === 0)) continue;
          const change = from === 0 ? 100 : ((to - from) / from) * 100;
          if (from !== 0 && Math.abs(change) < MIN_CHANGE * 100) continue;
          moves.push({
            id: shortHash(`${m.id}:${field}:${nowIso}`),
            modelId: m.id,
            name: m.name,
            ...(OR_VENDOR[m.id.split("/")[0]] ? { lab: OR_VENDOR[m.id.split("/")[0]] } : {}),
            at: nowIso,
            field,
            from,
            to,
            change: Math.round(change * 10) / 10,
          });
        }
      }

      const vendor = m.id.split("/")[0];
      models.push({
        id: m.id,
        name: m.name,
        vendor,
        ...(OR_VENDOR[vendor] ? { lab: OR_VENDOR[vendor] } : {}),
        contextLength: m.context_length ?? null,
        prompt,
        completion,
        free: prompt === 0 && completion === 0,
        modalities: [...new Set([...(m.architecture?.input_modalities ?? []), ...(m.architecture?.output_modalities ?? [])])],
        createdAt: m.created ? parseDate(m.created)?.toISOString() ?? null : null,
        firstSeenAt: prev?.firstSeenAt ?? nowIso,
        lastSeenAt: nowIso,
        history: history.slice(-HISTORY_MAX),
      });
    }

    const cutoff = now.getTime() - MOVES_KEEP_DAYS * 86_400_000;
    const allMoves = [...moves, ...prevMoves].filter((x) => Date.parse(x.at) >= cutoff).sort((a, b) => b.at.localeCompare(a.at));
    models.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    log(`[models] ✓ ${models.length} models · ${moves.length} new price moves`);
    return { models, moves: allMoves, status: { ...base, ok: true, lastSuccessAt: nowIso, lastError: null, fetched: res.data.length, accepted: models.length } };
  } catch (err) {
    log(`[models] ✗ ${errorMessage(err)}`);
    return { models: prevModels, moves: prevMoves, status: { ...base, ok: false, lastSuccessAt: prevStatus?.lastSuccessAt ?? null, lastError: errorMessage(err), fetched: 0, accepted: 0 } };
  }
}

export function saveModels(models: ModelEntry[], moves: PriceMove[]): boolean {
  const a = writeJson(dataPath("models.json"), models);
  const b = writeJson(dataPath("price-moves.json"), moves);
  return a || b;
}
