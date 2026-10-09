# AI Radar — Your AI Intelligence Hub

An **automated** tracker for the global AI landscape: updates from 20 LLM labs, new models, coding agents, promos & free credits, AI startups, and new tools — in one fast, modern, mobile-friendly website.

> Core principle: **no fabricated data.** Every item comes from a public source (official blogs/RSS, GitHub, Hugging Face, Hacker News, the OpenRouter API). When a source fails, the last valid data stays online and its health is shown transparently on `/status`.

## Features

| Page | What's inside |
| --- | --- |
| **Today** `/` | AI Daily Briefing, stats, and a chronological Global Feed across 20 labs with Today / 7 Days / 30 Days / Important Only / Unread filters, categories, lab filter, Newest/Most Important sorting |
| **AI Labs** `/labs` | 20 lab cards with logos, 30-day activity sparklines, "N new" badges since your last visit, coverage status |
| **Lab detail** `/labs/[slug]` | Full timeline (newest first): date/time, title, summary, category, practical benefit, source link, verification status, last-updated date; category filter, search, time range, pagination; per-source health |
| **Discover** `/discover` | Opportunity radar: **X buzz** (tips + posts linked by AI newsletters, read via X's official oEmbed), newsletters, new GitHub repos, Show HN, HF trending Spaces, Product Hunt (optional) — what it does, what's unique, benefit, pricing, why it's on the radar; separates **brand new** from **older but trending**; plus a **Startup Radar** of funding/launch headlines |
| **Models** `/models` | 380+ models with live OpenRouter list prices, context length, free models, and a **price-move tracker** (every input/output price change, before → after) |
| **Submit** `/submit` | Send a tip (X post and/or product URL) → prefilled GitHub issue → published to Discover in minutes, bot replies on the issue |
| **Deals** `/deals` | Free tiers & official programs (re-verified every run with an evidence quote), free models live from OpenRouter (with end dates), lab promo announcements, community signals (flagged unverified) |
| **Saved** `/saved` | Bookmarks (localStorage, no account) |
| **Status** `/status` | Coverage per lab, health of every source, LLM status |

Today also features a **Live Radar** (animated sweep; each blip is a real update from the last 72h, by lab) and a **bento** of the top story, X buzz, new models, and price moves.

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
| `npm run tip -- --x <post> --url <site>` | Add a tip (X post / product) to `src/config/tips.json` |
| `npm run summaries:pending` / `summaries:check` | Editorial summaries queue / validator (daily Cursor run) |

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
| `X_BEARER_TOKEN` | No | Paid X API v2 recent search for launch posts (Discover works without it via tips + newsletters + oEmbed) |
| `NEXT_PUBLIC_SITE_URL` | No | Absolute URL for SEO (Vercel uses the production domain automatically) |

**API-frugal:** the LLM only runs for new items (≤14 days) without an LLM summary, in batches of 8, and results are stored permanently in JSON — no item is ever summarized twice. Every number in LLM output must appear in the source text, otherwise the template is kept. Without an LLM, summaries use the source's own lead sentence plus deterministic templates.

## Automation

- [`.github/workflows/collect.yml`](.github/workflows/collect.yml) — cron `17 */3 * * *` (every 3 hours), on new/edited tip issues (Discover only, so tips go live in minutes), plus a manual button (**Actions → Collect AI updates → Run workflow**). Runs tests, the collector, JSON validation, then commits `data/` (with rebase/retry). Each commit triggers a Vercel deploy.
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — lint, typecheck, test, and build for PRs and code pushes.

Secrets/variables (Settings → Secrets and variables → Actions):
- Secrets: `LLM_API_KEY`, `PRODUCT_HUNT_TOKEN`, `X_BEARER_TOKEN` (all optional)
- Variables: `LLM_BASE_URL`, `LLM_MODEL`, `LLM_MAX_ITEMS` (optional)

## Getting X buzz into AI Radar (no scraping)

X is never scraped. Posts reach AI Radar through legal paths only:

1. **Tips** — open `/submit`, paste the X post (and/or product URL) → a prefilled GitHub issue (label `radar-tip`). The issue triggers the collector, which reads the post via X's official **oEmbed** endpoint, resolves its links, loads the product page (name/description come from that page), and publishes it to Discover. The bot replies `✅ Added` and closes the issue, or asks for info. Owner tips publish automatically; others need the `approved` label.
   - From Cursor/terminal: `npm run tip -- --x https://x.com/user/status/123 --url https://product.com --note "why"` (stored in `src/config/tips.json`).
2. **Newsletters that curate AI Twitter** (Ben's Bites) — their product links and linked X posts are followed automatically.
3. **Optional X API** — set `X_BEARER_TOKEN` for recent-search of launch posts.

Configuration: [`src/config/buzz.ts`](src/config/buzz.ts).

## Daily editorial run (Cursor)

Once a day a scheduled Cursor agent acts as editor: it runs the collector, fixes broken sources, researches AI startups buzzing
on X (added as "Agent pick" tips), and writes English summaries / "Why it matters" lines / the daily briefing into
`summaries/*.json`. The site overlays those summaries at build time **only if they validate** (`npm run summaries:check`:
known id, unchanged source, length limits, no URLs, every number present in the source). Copy-paste prompt:
[`docs/CURSOR_DAILY_PROMPT.md`](docs/CURSOR_DAILY_PROMPT.md).

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
