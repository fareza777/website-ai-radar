# AI Radar — Your AI Intelligence Hub

An **automated** tracker for the global AI landscape: updates from 20 LLM labs, new models, coding agents, promos & free credits, AI startups, and new tools — in one fast, modern, mobile-friendly website.

> Core principle: **no fabricated data.** Every item comes from a public source (official blogs/RSS, GitHub, Hugging Face, Hacker News, the OpenRouter API). When a source fails, the last valid data stays online and its health is shown transparently on `/status`.

## Features

| Page | What's inside |
| --- | --- |
| **Today** `/` | AI Daily Briefing, stats, and a chronological Global Feed across 20 labs with Today / 7 Days / 30 Days / Important Only / Unread filters, categories, lab filter, Newest/Most Important sorting |
| **AI Labs** `/labs` | 20 lab cards with logos, 30-day activity sparklines, "N new" badges since your last visit, coverage status |
| **Lab detail** `/labs/[slug]` | Full timeline (newest first): date/time, title, summary, category, practical benefit, source link, verification status, last-updated date; category filter, search, time range, pagination; per-source health |
| **Discover** `/discover` | Opportunity radar: new GitHub repos, Show HN, Product Hunt (optional), watchlist — what it does, what's unique, benefit, pricing, why it's on the radar; separates **brand new** from **older but trending** |
| **Deals** `/deals` | Free tiers & official programs (re-verified every run with an evidence quote), free models live from OpenRouter (with end dates), lab promo announcements, community signals (flagged unverified) |
| **Saved** `/saved` | Bookmarks (localStorage, no account) |
| **Status** `/status` | Coverage per lab, health of every source, LLM status |

Plus: global search **⌘K / Ctrl+K / `/`**, dark/light mode, read/unread & last-visited tracking (localStorage), SEO (metadata, sitemap, robots, OG image, JSON-LD).

## Architecture

```
GitHub Actions (cron, every 3 hours)
  └─ npm run collect  ──►  data/*.json  ──► git commit ──► Vercel auto-deploy (static)
        │
        ├─ Labs: RSS/Atom · Hugging Face API · GitHub Releases (Atom) · new GitHub repos
        │     date normalization → cross-source dedupe → classification → ranking → summaries
        ├─ Discover: GitHub Search · Hacker News (Algolia) · Product Hunt* · watchlist
        ├─ Deals: official-page verification · OpenRouter models API · lab promo feeds · HN
        └─ Daily briefing (template; optional LLM*)                 * = optional via env
```

- **Next.js 16 App Router** (Cache Components), **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**, **Lucide**.
- Every page is **statically prerendered** from `data/*.json` — fast and cheap (no database, no runtime API).
- Relative times ("3 hours ago"), unread state, and bookmarks are computed in the browser.

## Quick start

```bash
npm install
npm run collect        # fetch real data (~1 min). Optional: GITHUB_TOKEN=... for higher rate limits
npm run dev            # http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm run collect` | Full collector run (labs + discover + deals + briefing) |
| `npm run collect -- --only=labs --lab=openai` | One stage / one lab |
| `npm run collect -- --backfill-days=90` | Window for accepting items |
| `npm test` | Pipeline unit tests (parser, normalization, dedupe, classification) |
| `npm run lint` · `npm run typecheck` | Code quality |
| `npm run build` | Production build (also generates `public/search-index.json`) |
| `npm run build:logos` | Regenerate inline logos from `public/logos/*.svg` |

## Environment variables

See [`.env.example`](.env.example).

| Variable | Required | Notes |
| --- | --- | --- |
| `GITHUB_TOKEN` | No (automatic in Actions) | Higher GitHub API limits for Discover |
| `LLM_API_KEY` | No | Enables richer summaries/analysis via a cheap LLM |
| `LLM_BASE_URL` | No | Any OpenAI-compatible endpoint (default OpenRouter) |
| `LLM_MODEL` | No | Default `deepseek/deepseek-v4-flash` |
| `LLM_MAX_ITEMS` | No | Max items summarized per run (default 40) — cost control |
| `PRODUCT_HUNT_TOKEN` | No | Enables Product Hunt in Discover |
| `NEXT_PUBLIC_SITE_URL` | No | Absolute URL for SEO (Vercel uses the production domain automatically) |

**API-frugal:** the LLM only runs for new items (≤14 days) without an LLM summary, in batches of 8, and results are stored permanently in JSON — no item is ever summarized twice. Every number in LLM output must appear in the source text, otherwise the template is kept. Without an LLM, summaries use the source's own lead sentence plus deterministic templates.

## Automation

- [`.github/workflows/collect.yml`](.github/workflows/collect.yml) — cron `17 */3 * * *` (every 3 hours) plus a manual button (**Actions → Collect AI updates → Run workflow**). Runs tests, the collector, JSON validation, then commits `data/` (with rebase/retry). Each commit triggers a Vercel deploy.
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — lint, typecheck, test, and build for PRs and code pushes.

Secrets/variables (Settings → Secrets and variables → Actions):
- Secrets: `LLM_API_KEY`, `PRODUCT_HUNT_TOKEN` (both optional)
- Variables: `LLM_BASE_URL`, `LLM_MODEL`, `LLM_MAX_ITEMS` (optional)

## Source configuration

All sources live in one place and are easy to change:

- [`src/config/labs.ts`](src/config/labs.ts) — 20 labs + per-lab sources (RSS, Hugging Face, GitHub Releases, new GitHub repos), include/exclude filters, official domains for verification.
- [`src/config/discover.ts`](src/config/discover.ts) — GitHub queries, HN thresholds, repo watchlist.
- [`src/config/deals.ts`](src/config/deals.ts) — free-tier/credit programs + required evidence text (`mustContain`).

Full guide (Indonesian): [`docs/SOURCES.md`](docs/SOURCES.md). Daily maintenance with Cursor (Indonesian): [`docs/CURSOR_GUIDE.md`](docs/CURSOR_GUIDE.md).

## Current coverage

| Coverage | Labs |
| --- | --- |
| **Official feed** (official RSS/blog + GitHub/HF) | OpenAI, Google DeepMind, Microsoft, Amazon, NVIDIA, IBM |
| **Via mirror** (no RSS → community mirror of official pages + official GitHub/HF) | Anthropic, xAI, Meta, Mistral, Cohere |
| **Partial** (no machine-readable blog → official Hugging Face + GitHub) | DeepSeek, Qwen, Moonshot Kimi, Z.ai GLM, MiniMax, Baidu, Tencent, ByteDance, AI21 |

X/Twitter is never scraped. Labs with nothing new in 90 days show their latest real releases (up to 1 year) so all 20 cards always have content.

## Project structure

```
src/app/            pages (Today, labs, discover, deals, saved, status) + sitemap/robots/OG
src/components/     UI (update cards, timeline, lab grid, ⌘K search, filters, theme)
src/config/         source registry: labs.ts, discover.ts, deals.ts
src/lib/            data types, server data loader, formatting, localStorage state
scripts/collect.ts  collector entrypoint
scripts/collector/  http, feed parser, sources, merge/dedupe, classify, summarize, llm, discover, deals, briefing
data/               collector output (committed): updates/<lab>.json, discover.json, deals.json, briefings.json, status.json
tests/              pipeline unit tests (vitest)
```

## Deploying to Vercel

1. Import this repo in Vercel (framework: Next.js, no extra config).
2. Optionally set `NEXT_PUBLIC_SITE_URL` for a custom domain.
3. Every data commit from GitHub Actions triggers a redeploy automatically.

## License & attribution

Lab logos from [@lobehub/icons](https://github.com/lobehub/lobe-icons) (MIT) — trademarks belong to their respective owners. Community RSS mirrors: [Olshansk/rss-feeds](https://github.com/Olshansk/rss-feeds).
