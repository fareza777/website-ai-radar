export const SITE = {
  name: "AI Radar",
  tagline: "Your AI Intelligence Hub",
  description:
    "Pantau update 20 lab AI global — model baru, fitur, API, harga, promo, free credits, coding agents, dan tools AI baru — otomatis dari sumber resmi, dalam satu tempat.",
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
