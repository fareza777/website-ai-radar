import type { Category, SourceType } from "../../src/lib/types";

/**
 * Model release signals. Product names alone ("Claude for Teachers", "Gemini in Chrome") are NOT
 * model releases — a model needs a version/size ("Claude Opus 5.5", "GPT-6", "Qwen3.8-27B") or an
 * explicit model word.
 */
const VERSIONED_MODEL =
  /((gpt|\bo)-?\d|gpt-oss|claude( \w+)? \d|(opus|sonnet|haiku|mythos) \d|gemini( \w+)? \d|gemma ?\d|veo ?\d|imagen ?\d|grok[- ]?\d|deepseek[- ]?(v|r)\d|qwen ?\d|qwq|kimi[- ]?k?\d|glm[- ]?\d|llama ?\d|(mistral|magistral|devstral|codestral|ministral|pixtral|voxtral)( \w+)? ?\d|minimax[- ]?(m|h)?\d|command[- ]?(a|r)\b|aya \w+|phi-?\d|nova (pro|lite|micro|premier|\d)|ernie[- ]?\d|hunyuan|doubao|seed-?\d|nemotron[- ]?\d|jamba ?\d|granite[- ]?\d|sora ?\d|whisper|(?<![$\d.,])\b\d+(\.\d+)?b\b)/i;
const MODEL_WORDS = /(\bmodels?\b|open[- ]weights?|checkpoint|reasoning model|frontier model|\bllm\b)/i;

interface Rule {
  category: Category;
  pattern: RegExp;
  weight: number;
}

const RULES: Rule[] = [
  { category: "promo", weight: 4, pattern: /(free credits?|\bcredits?\b|% off|discount|promo(tion)?|limited[- ]time|free trial|\bfree for\b|now free|giveaway|hackathon)/i },
  { category: "pricing", weight: 3, pattern: /(pricing|price (cut|drop|change|increase|reduction)s?|(new|lower|reduced) prices?|cheaper|cost[- ]?(reduction|savings)|per million tokens|rate limits?|subscription|billing|\b(free|plus|pro|max|team|business|enterprise) (plans?|tiers?)\b|included with (more )?plans|usage tiers?)/i },
  { category: "model", weight: 4, pattern: new RegExp(`(${VERSIONED_MODEL.source}|${MODEL_WORDS.source})`, "i") },
  { category: "api", weight: 3, pattern: /(\bapi\b|\bsdk\b|endpoint|responses api|realtime|batch api|function calling|tool (use|calling)|structured outputs?|webhooks?|\bmcp\b|agents? sdk|developer platform)/i },
  { category: "research", weight: 2, pattern: /(research|paper|study|benchmark|arxiv|interpretab|alignment|safety|evaluat|we (find|show|study)|dataset|scientific|theorem|reinforcement learning)/i },
  { category: "developer", weight: 2, pattern: /(developer|\bcli\b|open[- ]source|github|framework|library|integration|tutorial|how to|guide|build(ing)? (with|an?)|deploy|fine[- ]tun|inference|kubernetes|cookbook)/i },
  { category: "feature", weight: 2, pattern: /(now available|rolling out|new feature|introduc|launch|available in|\bapp\b|chatgpt|copilot|le chat|assistant|voice|memory|\bsearch\b|canvas|workspace|enterprise|update)/i },
];

const TIE_ORDER: Category[] = ["promo", "pricing", "model", "api", "feature", "research", "developer"];

export function classify(title: string, excerpt: string, sourceType: SourceType): Category {
  if (sourceType === "huggingface") return "model";
  if (sourceType === "github-releases") return "developer";
  if (sourceType === "github-new-repos") {
    return VERSIONED_MODEL.test(title) ? "model" : "developer";
  }
  const scores = new Map<Category, number>();
  for (const rule of RULES) {
    let s = 0;
    if (rule.pattern.test(title)) s += rule.weight * 3;
    if (rule.pattern.test(excerpt)) s += rule.weight;
    if (s > 0) scores.set(rule.category, (scores.get(rule.category) ?? 0) + s);
  }
  // Promo/pricing need a title-level hit; a passing mention in the body is too weak.
  for (const c of ["promo", "pricing"] as const) {
    const rule = RULES.find((r) => r.category === c)!;
    if (!rule.pattern.test(title)) scores.delete(c);
  }
  let best: Category = "feature";
  let bestScore = 0;
  for (const c of TIE_ORDER) {
    const s = scores.get(c) ?? 0;
    if (s > bestScore) {
      best = c;
      bestScore = s;
    }
  }
  return best;
}

const FLAGSHIP =
  /(introducing|announcing|launch(es|ed|ing)?\b|now available|generally available|\bga\b|release[sd]?\b|meet |unveil|debut|gpt-\d|claude \w+ \d|gemini \d|grok \d|llama \d|deepseek-?v\d|qwen\d|kimi[- ]k\d|glm-\d|mistral (large|medium) \d|command a\b)/i;
const LOW_VALUE = /(how to|tutorial|step-by-step|best practices|webinar|customer story|case study|podcast|recap|events? recap|livestream|we're hiring|careers|\b\d+ (steps|ways|tips|things)\b|into the omniverse|this week in|^how [\w.&'-]+( [\w.&'-]+)? (uses?|turns|builds?|scales?|orchestrates|cuts?|reduced|transforms|accelerates)\b|\bturns [\w\s]+ into\b|brings (more of )?(claude|chatgpt|gemini) to)/i;
const FRONTIER = new Set(["openai", "anthropic", "google-deepmind", "xai", "deepseek", "qwen", "meta", "mistral", "moonshot", "zai"]);

const BASE: Record<Category, number> = {
  model: 55, pricing: 50, promo: 50, api: 45, feature: 45, research: 35, developer: 25,
};

export interface RankInput {
  lab: string;
  title: string;
  category: Category;
  sourceType: SourceType;
  verified: boolean;
  meta?: Record<string, string | number>;
}

/** 0–100 relevance score. Deterministic, recomputed every run. */
export function importance(item: RankInput): number {
  let score = BASE[item.category];
  if (item.verified) score += 5;
  if (FRONTIER.has(item.lab)) score += 5;
  if (FLAGSHIP.test(item.title)) score += 15;
  if (LOW_VALUE.test(item.title)) score -= 15;

  if (item.sourceType === "huggingface") {
    const likes = Number(item.meta?.likes ?? 0);
    score += Math.min(25, Math.round(Math.log10(likes + 1) * 8)) - 10;
  }
  if (item.sourceType === "github-releases") {
    const kind = item.meta?.semver;
    if (kind === "major") score += 25;
    else if (kind === "minor") score += 10;
    else if (kind === "patch") score -= 10;
  }
  if (item.sourceType === "github-new-repos") {
    const stars = Number(item.meta?.stars ?? 0);
    score += Math.min(20, Math.round(Math.log10(stars + 1) * 6)) - 5;
  }
  return Math.max(0, Math.min(100, score));
}

export function extractTags(title: string, excerpt: string): string[] {
  const tags = new Set<string>();
  const size = /(\d+(?:\.\d+)?)\s?([bm])\b(?:-a(\d+(?:\.\d+)?)b)?/i.exec(title);
  if (size) tags.add(`${size[1]}${size[2].toUpperCase()}${size[3] ? `-A${size[3]}B` : ""}`);
  const hay = `${title} ${excerpt}`.toLowerCase();
  const map: [RegExp, string][] = [
    [/open[- ]?(weights?|source)/, "open-source"],
    [/\bagents?\b|agentic/, "agents"],
    [/coding|\bcode\b|codex|cli\b/, "coding"],
    [/vision|image|multimodal|video|vl\b/, "multimodal"],
    [/speech|voice|audio|tts|asr/, "audio"],
    [/reasoning|thinking/, "reasoning"],
    [/\bmcp\b|model context protocol/, "mcp"],
    [/safety|alignment|security/, "safety"],
    [/embedding|rerank|retriev|\brag\b/, "rag"],
  ];
  for (const [re, tag] of map) if (re.test(hay)) tags.add(tag);
  return [...tags].slice(0, 5);
}

export function semverKind(version: string): "major" | "minor" | "patch" | null {
  const m = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(version);
  if (!m) return null;
  const [, , minor, patch] = m;
  if (patch && Number(patch) > 0) return "patch";
  if (Number(minor) === 0) return "major";
  return "minor";
}

export function isPrerelease(version: string): boolean {
  return /(alpha|beta|\brc\b|-rc|\.rc|nightly|preview|canary|\bdev\b|snapshot|insiders)/i.test(version);
}
