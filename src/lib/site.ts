export const SITE = {
  name: "AI Radar",
  tagline: "Your AI Intelligence Hub",
  description:
    "Track 20 global AI labs in one place — new models, features, APIs, pricing, promos, free credits, coding agents, and new AI tools — collected automatically from official sources.",
  repo: "https://github.com/fareza777/website-ai-radar",
};

/**
 * Absolute site URL for canonicals, sitemap and structured data.
 * On a Vercel production build the production domain attached to the project wins (Vercel exposes the shortest custom
 * domain, falling back to *.vercel.app), so the canonical always follows the real domain — no hard-coded host to go stale.
 */
export function siteUrl(): string {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.VERCEL_ENV === "production" && production) return `https://${production}`;
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (production) return `https://${production}`;
  return "http://localhost:3000";
}
