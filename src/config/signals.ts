/**
 * SIGNALS configuration — everything beyond official lab feeds, so nothing slips through:
 *  - press:  media reports per lab (Google News RSS) — shown as "Press", never as verified
 *  - papers: Hugging Face Daily Papers, attributed to a lab by organization
 *  - pulse:  Hacker News discussions that mention a lab/product
 */

export interface PressQuery {
  lab: string;
  /** Google News search terms (OR-joined, quoted phrases allowed). */
  terms: string;
}

export const PRESS_QUERIES: PressQuery[] = [
  { lab: "openai", terms: '"OpenAI" OR ChatGPT OR Codex' },
  { lab: "anthropic", terms: 'Anthropic OR "Claude Code" OR "Claude Opus" OR "Claude Sonnet"' },
  { lab: "google-deepmind", terms: '"Google DeepMind" OR "Gemini 4" OR "Gemini AI"' },
  { lab: "xai", terms: 'xAI OR "Grok AI" OR "Grok 4"' },
  { lab: "deepseek", terms: "DeepSeek" },
  { lab: "qwen", terms: 'Alibaba Qwen OR "Qwen3" OR "Qwen AI"' },
  { lab: "moonshot", terms: '"Moonshot AI" OR "Kimi K"' },
  { lab: "zai", terms: '"Z.ai" OR Zhipu OR "GLM-5" OR "GLM 5"' },
  { lab: "meta", terms: '"Meta AI" OR Llama OR "Meta Superintelligence"' },
  { lab: "mistral", terms: '"Mistral AI"' },
  { lab: "minimax", terms: "MiniMax AI OR Hailuo OR MiniMax-M" },
  { lab: "cohere", terms: 'Cohere AI OR "Cohere Command" OR "Cohere Embed"' },
  { lab: "microsoft", terms: '"Microsoft AI" OR "Azure AI" OR "Microsoft Copilot" OR "Microsoft Foundry"' },
  { lab: "amazon", terms: '"Amazon Bedrock" OR "Amazon Nova" OR "AWS AI" OR Kiro' },
  { lab: "baidu", terms: "Baidu ERNIE OR \"Baidu AI\"" },
  { lab: "tencent", terms: "Tencent Hunyuan OR \"Tencent AI\"" },
  { lab: "bytedance", terms: 'ByteDance Seed OR Doubao OR "ByteDance AI"' },
  { lab: "nvidia", terms: "NVIDIA Nemotron OR \"NVIDIA AI\" OR \"NVIDIA NIM\"" },
  { lab: "ai21", terms: '"AI21 Labs" OR Jamba' },
  { lab: "ibm", terms: 'IBM Granite OR watsonx OR "IBM AI"' },
];

export const PRESS = {
  /** Google News freshness window for each query. */
  window: "14d",
  /** Press items older than this are dropped from the archive. */
  keepDays: 45,
  maxPerQuery: 60,
  maxArchive: 2500,
  /** Two reports of one story: title similarity (Jaccard) at/above this and within this many days. */
  clusterSimilarity: 0.5,
  clusterDays: 3,
  /** Skip headline noise that is not news about the lab's AI work. */
  exclude:
    "(\\bstocks?\\b|\\bshares? of\\b|\\bshares?\\s+(?:price|market|(?:fall|fell|drop|ris|rose|jump|surg|slid|soar|tumbl|climb|gain|sink|sank)\\w*)|price target|buy or sell|should you buy|dividend|earnings call|\\betfs?\\b|\\bportfolio\\b|analyst rating|class action|lawsuit settlement|horoscope|crossword|sponsored)",
} as const;

/** Hugging Face organization slug → tracked lab slug. */
export const PAPER_ORGS: Record<string, string> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google-deepmind",
  deepmind: "google-deepmind",
  "google-deepmind": "google-deepmind",
  "xai-org": "xai",
  "deepseek-ai": "deepseek",
  qwen: "qwen",
  "tongyi-mai": "qwen",
  alibaba: "qwen",
  "alibaba-nlp": "qwen",
  moonshotai: "moonshot",
  "zai-org": "zai",
  thudm: "zai",
  facebook: "meta",
  "meta-llama": "meta",
  meta: "meta",
  mistralai: "mistral",
  minimaxai: "minimax",
  cohereforai: "cohere",
  coherelabs: "cohere",
  microsoft: "microsoft",
  amazon: "amazon",
  baidu: "baidu",
  tencent: "tencent",
  "tencent-hunyuan": "tencent",
  bytedance: "bytedance",
  "bytedance-seed": "bytedance",
  nvidia: "nvidia",
  ai21labs: "ai21",
  "ibm-granite": "ibm",
  ibm: "ibm",
};

export const PAPERS = {
  fetchLimit: 100,
  keepDays: 45,
  maxArchive: 800,
  /** Papers without a tracked lab are kept only with at least this many upvotes. */
  minUpvotesUnattributed: 40,
} as const;

/** Name fragments used to attribute community/press text to a lab. Lower-case, matched as whole words. */
export const LAB_ALIASES: Record<string, string[]> = {
  openai: ["openai", "chatgpt", "gpt-6", "gpt-5", "codex", "sora"],
  anthropic: ["anthropic", "claude", "claude code"],
  "google-deepmind": ["deepmind", "gemini", "gemma", "veo", "google ai"],
  xai: ["xai", "grok"],
  deepseek: ["deepseek"],
  qwen: ["qwen", "alibaba cloud", "tongyi"],
  moonshot: ["moonshot", "kimi"],
  zai: ["z.ai", "zhipu", "glm"],
  meta: ["meta ai", "llama", "meta superintelligence"],
  mistral: ["mistral"],
  minimax: ["minimax", "hailuo"],
  cohere: ["cohere"],
  microsoft: ["microsoft ai", "copilot", "azure ai", "foundry"],
  amazon: ["bedrock", "amazon nova", "aws ai", "kiro"],
  baidu: ["baidu", "ernie"],
  tencent: ["tencent", "hunyuan"],
  bytedance: ["bytedance", "doubao", "seed-"],
  nvidia: ["nvidia", "nemotron"],
  ai21: ["ai21", "jamba"],
  ibm: ["ibm granite", "watsonx", "ibm research"],
};

export const PULSE = {
  lookbackDays: 3,
  minPoints: 60,
  keepDays: 7,
  maxArchive: 150,
  /** Hacker News Algolia queries (one request each). */
  queries: [
    "OpenAI", "ChatGPT", "Anthropic", "Claude", "Gemini", "DeepMind", "Grok", "DeepSeek", "Qwen", "Kimi", "GLM",
    "Llama", "Mistral", "Nvidia AI", "LLM", "AI agent", "GPT",
  ],
} as const;

// ───────────────────────── social (X + Threads) ─────────────────────────

/**
 * Official social accounts per lab. Posts from these handles are attributed to the lab and shown as
 * "official social" items. Keep the lists short and verified — a wrong handle only means missed posts.
 * Threads handles are optional (few labs post there); fill them in when you know them.
 */
export const LAB_SOCIAL: Record<string, { x: string[]; threads: string[] }> = {
  openai: { x: ["OpenAI", "OpenAIDevs", "OpenAINewsroom", "ChatGPT", "ChatGPTapp"], threads: [] },
  anthropic: { x: ["AnthropicAI", "claudeai", "ClaudeDevs"], threads: [] },
  "google-deepmind": { x: ["GoogleDeepMind", "GoogleAI", "GoogleAIStudio", "GeminiApp"], threads: [] },
  xai: { x: ["xai", "grok"], threads: [] },
  deepseek: { x: ["deepseek_ai"], threads: [] },
  qwen: { x: ["Alibaba_Qwen"], threads: [] },
  moonshot: { x: ["Kimi_Moonshot"], threads: [] },
  zai: { x: ["Zai_org"], threads: [] },
  meta: { x: ["AIatMeta"], threads: ["metaai"] },
  mistral: { x: ["MistralAI"], threads: [] },
  minimax: { x: ["MiniMax__AI"], threads: [] },
  cohere: { x: ["cohere"], threads: [] },
  microsoft: { x: ["MSFTResearch", "MicrosoftAI"], threads: [] },
  amazon: { x: ["awscloud", "AmazonScience"], threads: [] },
  baidu: { x: ["Baidu_Inc"], threads: [] },
  tencent: { x: ["TencentHunyuan"], threads: [] },
  bytedance: { x: ["ByteDanceOSS"], threads: [] },
  nvidia: { x: ["nvidia", "NVIDIAAIDev"], threads: [] },
  ai21: { x: ["AI21Labs"], threads: [] },
  ibm: { x: ["IBMResearch"], threads: [] },
};

// A Map, not a plain object: handles like "constructor" must not resolve to Object.prototype members.
const HANDLE_TO_LAB = new Map<string, string>(
  Object.entries(LAB_SOCIAL).flatMap(([lab, h]) => [...h.x, ...h.threads].map((handle): [string, string] => [handle.toLowerCase(), lab])),
);

/** Tracked lab owning an official handle (case-insensitive), if any. */
export function labFromHandle(handle: string): string | undefined {
  return HANDLE_TO_LAB.get(handle.replace(/^@/, "").toLowerCase());
}

export const SOCIAL = {
  keepDays: 30,
  maxArchive: 700,
  /** X API v2 recent search: look back this many days (API maximum is 7). */
  xApiDays: 7,
  /** Threads keyword search: keep community posts with at least this many likes. */
  threadsMinLikes: 40,
  /** Threads keyword search terms (official lab handles are read via profile posts when permitted). */
  threadsKeywords: ["OpenAI", "Anthropic Claude", "Gemini", "DeepSeek", "Qwen", "Llama", "Mistral AI", "AI agents"],
} as const;
