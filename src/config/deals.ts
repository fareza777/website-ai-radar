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
    // Google serves the rendered docs page as an Angular shell whose body text lives in a <noscript> block,
    // which stripHtml drops. The same page is published as markdown on the official domain (linked from the
    // page itself), so verification reads that. ai.google.dev/gemini-api/docs/pricing 301s here (2026-11-03).
    url: "https://aistudio.google.com/docs/pricing.md",
    mustContain: "Start building free of charge with generous limits",
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
    id: "sambanova-free-tier",
    title: "SambaNova Cloud — Free Tier",
    provider: "SambaNova Cloud",
    kind: "free-tier",
    description: "Rate-limited Free Tier for the SambaNova Cloud API; it applies to accounts with no payment method linked, with a tokens-per-day cap.",
    url: "https://docs.sambanova.ai/docs/en/models/rate-limits",
    mustContain: "Applied when there is no payment method linked with your account",
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
    title: "Cursor Free",
    provider: "Cursor",
    kind: "free-tier",
    description: "Free plan with limited agent requests and limited Chat requests.",
    url: "https://cursor.com/pricing",
    mustContain: "Limited agent requests",
  },
  {
    id: "cohere-trial-api-key",
    title: "Cohere — Free Trial API key",
    provider: "Cohere",
    kind: "free-tier",
    description: "API calls made from a Trial API key are free, with rate limits and no production or commercial use.",
    url: "https://cohere.com/pricing",
    mustContain: "Trial API key are free",
    lab: "cohere",
  },
  {
    id: "huggingface-inference-credits",
    title: "Hugging Face Inference Providers — monthly credits",
    provider: "Hugging Face",
    kind: "credits",
    description: "PRO users and Team or Enterprise organizations receive monthly credits for Inference Providers; free users buy credits or upgrade.",
    url: "https://huggingface.co/docs/inference-providers/pricing",
    mustContain: "receive monthly credits",
  },
  {
    id: "cloudflare-workers-ai-free",
    title: "Cloudflare Workers AI — daily free Neurons",
    provider: "Cloudflare",
    kind: "free-tier",
    description: "Anyone can use a total of 10,000 Neurons per day at no charge; usage beyond that needs the Workers Paid plan at $0.011 per 1,000 Neurons.",
    url: "https://developers.cloudflare.com/workers-ai/platform/pricing/",
    mustContain: "10,000 Neurons per day at no charge",
  },
  {
    id: "mistral-free-plan",
    title: "Mistral — Free plan",
    provider: "Mistral AI",
    kind: "free-tier",
    description: "Limited free access to Vibe and Mistral Studio, including the latest models, chat, search, and Vibe for code for agentic coding in your terminal.",
    url: "https://docs.mistral.ai/getting-started/pricing",
    mustContain: "Free plan provides limited access to Vibe",
    lab: "mistral",
  },
  {
    id: "aws-free-tier-credits",
    title: "AWS Free Tier — credits for new customers",
    provider: "Amazon Web Services",
    kind: "credits",
    description: "New AWS Free Tier accounts get up to $200 in credits over 6 months, with $100 issued immediately and more earned as services are used.",
    url: "https://aws.amazon.com/free/",
    mustContain: "up to \\$200 in credits",
    lab: "amazon",
  },
  {
    id: "gcp-free-trial-credits",
    title: "Google Cloud — credits for new customers",
    provider: "Google Cloud",
    kind: "credits",
    description: "New Google Cloud customers get $300 in free credits on signup, on top of free monthly usage.",
    url: "https://cloud.google.com/free",
    mustContain: "\\$300 in free credits on signup",
    lab: "google-deepmind",
  },
  {
    id: "azure-free-account-credits",
    title: "Azure free account — $200 credit",
    provider: "Microsoft Azure",
    kind: "credits",
    description: "New Azure customers get a $200 credit for 30 days, plus 12 months of select free services and free monthly amounts of always-free products.",
    url: "https://azure.microsoft.com/en-us/free/",
    mustContain: "\\$200 credit",
    lab: "microsoft",
  },
  {
    id: "claude-free-plan",
    title: "Claude — Free plan",
    provider: "Anthropic",
    kind: "free-tier",
    description:
      "Anthropic lists a Claude Free plan at $0, open to everyone, with limited usage every 5 hours and every week across chat on web, desktop and mobile.",
    url: "https://www.anthropic.com/pricing",
    mustContain: "Free for everyone",
    lab: "anthropic",
  },
  {
    id: "openrouter-free-plan",
    title: "OpenRouter — Free plan",
    provider: "OpenRouter",
    kind: "free-tier",
    description:
      "OpenRouter lists a Free plan with access to its free models and free providers, a 50 requests/day rate limit, community support, and platform fees shown as N/A.",
    url: "https://openrouter.ai/pricing",
    mustContain: "Get started for free",
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
