export const SITE = {
  name: "AI Radar",
  tagline: "Your AI Intelligence Hub",
  description:
    "Track 20 global AI labs in one place — new models, features, APIs, pricing, promos, free credits, coding agents, and new AI tools — collected automatically from official sources.",
  repo: "https://github.com/fareza777/website-ai-radar",
};

const isVercelAppUrl = (url: string) => /^https?:\/\/[^/]*\.vercel\.app(\/|$)/i.test(url);

/**
 * Absolute site URL for canonicals, sitemap and structured data.
 *
 * On a Vercel production build the canonical is, in order:
 *  1. NEXT_PUBLIC_SITE_URL when it names a custom domain (a deliberate override, e.g. if the apex ever redirects to www);
 *  2. the production domain attached to the project (VERCEL_PROJECT_PRODUCTION_URL: the shortest custom domain, else *.vercel.app).
 * A stale *.vercel.app value in NEXT_PUBLIC_SITE_URL therefore never beats the real domain.
 * Elsewhere (previews, CI, local) the explicit URL wins, then the production URL, then localhost.
 *
 * On Vercel an unresolvable URL fails the build instead of publishing localhost canonicals; a failed build keeps the previous
 * good deployment live.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || undefined;
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || undefined;
  const productionUrl = production ? `https://${production}` : undefined;

  if (process.env.VERCEL_ENV === "production") {
    if (explicit && !isVercelAppUrl(explicit)) return explicit;
    if (productionUrl) return productionUrl;
  }
  const resolved = explicit ?? productionUrl;
  if (resolved) return resolved;
  if (process.env.VERCEL === "1") {
    throw new Error("siteUrl(): neither NEXT_PUBLIC_SITE_URL nor VERCEL_PROJECT_PRODUCTION_URL is set — enable \"Automatically expose System Environment Variables\" in the Vercel project settings.");
  }
  return "http://localhost:3000";
}
