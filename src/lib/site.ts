export const SITE = {
  name: "AI Radar",
  tagline: "Your AI Intelligence Hub",
  description:
    "Track 20 global AI labs in one place — new models, features, APIs, pricing, promos, free credits, coding agents, and new AI tools — collected automatically from official sources.",
  repo: "https://github.com/fareza777/website-ai-radar",
};

/** Absolute site URL for metadata (Vercel sets VERCEL_PROJECT_PRODUCTION_URL automatically). */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
