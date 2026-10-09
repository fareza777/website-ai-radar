import type { DealKind } from "@/lib/types";

/**
 * DEALS & FREE CREDITS configuration.
 *
 * 1. Curated programs below are re-verified on EVERY run: the collector fetches `url`
 *    and only marks the deal "active" when `mustContain` is found on the official page.
 *    The matching text is stored as `evidence`. If the page fails or the text disappears,
 *    the deal is shown as "unverified" — never assumed active.
 * 2. Free models are pulled live from the public OpenRouter models API (price = 0).
 * 3. Promo/pricing announcements are detected from the labs' official feeds.
 * 4. Hacker News posts about credits/free tiers are listed as unverified community signals.
 */

export interface CuratedDeal {
  id: string;
  title: string;
  provider: string;
  kind: DealKind;
  description: string;
  url: string;
  /** Case-insensitive regex that must appear on the page for the deal to count as active. */
  mustContain: string;
  lab?: string;
  /** Set only if the official page states an end date (ISO). */
  endsAt?: string;
}

export const CURATED_DEALS: CuratedDeal[] = [
  {
    id: "gemini-api-free-tier",
    title: "Gemini API — Free Tier",
    provider: "Google AI Studio",
    kind: "free-tier",
    description: "Use the Gemini Developer API at no cost within rate limits — ideal for prototyping before moving to a paid tier.",
    url: "https://ai.google.dev/gemini-api/docs/pricing?hl=en",
    mustContain: "free of charge",
    lab: "google-deepmind",
  },
  {
    id: "groq-free-plan",
    title: "Groq — Free Plan",
    provider: "GroqCloud",
    kind: "free-tier",
    description: "Fast inference for open-weight models on a rate-limited Free Plan (per-model RPM/RPD/TPM).",
    url: "https://console.groq.com/docs/rate-limits",
    mustContain: "Free Plan Limits",
  },
  {
    id: "cerebras-free-trial",
    title: "Cerebras Inference — Free Trial",
    provider: "Cerebras",
    kind: "trial",
    description: "Free Trial tier for the Cerebras inference API with per-model RPM/TPM limits.",
    url: "https://inference-docs.cerebras.ai/support/rate-limits",
    mustContain: "Free Trial",
  },
  {
    id: "nvidia-nim-free-apis",
    title: "NVIDIA NIM — Free serverless APIs for development",
    provider: "NVIDIA build.nvidia.com",
    kind: "free-tier",
    description: "Free serverless NIM endpoints for experimentation and development on build.nvidia.com.",
    url: "https://build.nvidia.com/explore/discover",
    mustContain: "Free serverless APIs",
    lab: "nvidia",
  },
  {
    id: "github-copilot-free",
    title: "GitHub Copilot Free",
    provider: "GitHub",
    kind: "free-tier",
    description: "A $0 Copilot plan with limited completions and chat in your editor.",
    url: "https://github.com/features/copilot/plans",
    mustContain: "Free\\s*\\$0",
    lab: "microsoft",
  },
  {
    id: "cursor-hobby-free",
    title: "Cursor Hobby (free)",
    provider: "Cursor",
    kind: "free-tier",
    description: "Free Hobby plan — no credit card, limited agent requests.",
    url: "https://cursor.com/pricing",
    mustContain: "Hobby[\\s\\S]{0,60}Free",
  },
];

export const DEAL_SIGNALS = {
  /** Lab feed items matching this are surfaced as official promo/pricing announcements. */
  promoKeyword:
    "(free (credits?|tier|trial|access|for)|\\bcredits?\\b|discount|% off|promo|price (cut|drop|reduction)|lower(ed)? (prices?|pricing)|cheaper|now free|free for|limited[- ]time|trial)",
  hackernews: {
    queries: ["free credits AI", "free tier LLM API", "AI API discount", "free GPU credits"],
    lookbackDays: 21,
    minPoints: 20,
  },
  /** Announcement-type deals without a stated end date are hidden after this many days. */
  announcementTtlDays: 45,
} as const;
