/**
 * DISCOVER / OPPORTUNITY RADAR configuration.
 * All signals come from public APIs: GitHub Search, GitHub repo API, Hacker News (Algolia),
 * and Product Hunt (only when PRODUCT_HUNT_TOKEN is set).
 */

export const DISCOVER = {
  /** A project counts as "new" if created within this many days; otherwise it is "old but trending". */
  newWithinDays: 60,
  /** Keep discover items that had a signal within this many days. */
  keepDays: 45,
  maxItems: 150,

  github: {
    /** Search windows for newly created repos (GitHub Search API). */
    createdWithinDays: 30,
    minStars: 150,
    queries: [
      "topic:llm",
      "topic:ai-agents",
      "topic:agents",
      "topic:mcp",
      "topic:model-context-protocol",
      "topic:coding-agent",
      "topic:claude-code",
      "topic:rag",
      "topic:generative-ai",
      "\"coding agent\" in:description",
      "\"AI agent\" in:description",
      "\"LLM\" in:description",
    ],
    /** Older repos considered "trending" when they gain this many stars between runs (≈7 days). */
    trendingMinDelta7d: 300,
  },

  /** Repos tracked explicitly (still validated live against the GitHub API each run). */
  watchlist: ["antseed/antseed"],

  hackernews: {
    lookbackDays: 10,
    minPoints: 60,
    showHnMinPoints: 15,
    /** Title must match to count as AI-related. */
    keyword:
      "(\\bai\\b|\\bllm|gpt|claude|gemini|llama|mistral|deepseek|qwen|agent|copilot|mcp|inference|model|rag\\b|embedding|codex|cursor|openrouter|transformer)",
  },

  productHunt: {
    lookbackDays: 7,
    topic: "artificial-intelligence",
    max: 30,
  },
} as const;

export type DiscoverConfig = typeof DISCOVER;
