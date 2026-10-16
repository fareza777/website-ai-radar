# SEO & domain

Production domain: **airadarhub.top** (Vercel project `ai-radar`). The canonical URL is never hard-coded: `siteUrl()` in
`src/lib/site.ts` uses the production domain attached to the Vercel project, so canonicals, the sitemap, the feeds and structured
data follow the real domain automatically on the next deploy.

## What the code already does
| Area | Implementation |
|---|---|
| Titles, descriptions, canonicals | `pageMetadata()` in `src/lib/seo.ts` — every page sets its own, including Open Graph and Twitter cards (a page-level `openGraph` replaces the layout's, so each page repeats them) |
| Share images | site card `src/app/opengraph-image.tsx`; one card per lab `src/app/labs/[slug]/opengraph-image.tsx` |
| Structured data | WebSite + Organization + sitelinks search box (home), CollectionPage + ItemList + BreadcrumbList (labs), BreadcrumbList (other pages). Helpers: `src/lib/seo.ts`; component: `src/components/json-ld.tsx` |
| Crawlable `/firehose` | the newest 100 rows are rendered into the HTML (`src/lib/firehose.ts`); the full table loads afterwards |
| Internal linking | footer links to every section and all 20 labs |
| Discovery | `sitemap.xml`, `robots.txt`, Atom/JSON feeds (site + per lab, advertised on every page), `llms.txt` |
| Hygiene | `/saved` is `noindex`; data files (`firehose.json`, `feed-older.json`, `search-index.json`) send `X-Robots-Tag: noindex`; security headers in `next.config.ts` |
| Install / icons | `icon.tsx`, `apple-icon.tsx`, `manifest.ts` |

## One-time setup (cannot be done from code)
1. **Attach the domain** — Vercel → project `ai-radar` → Settings → Domains → add `airadarhub.top` (and `www.airadarhub.top`, redirecting to the apex).
2. **DNS** — easiest: point the registrar's nameservers at `ns1.vercel-dns.com` / `ns2.vercel-dns.com`. Otherwise add `A @ 76.76.21.21` and `CNAME www cname.vercel-dns.com` at the registrar.
3. **Redirect the old URL** — Settings → Domains → `ai-radar-lilac.vercel.app` → Redirect to `airadarhub.top` (permanent). Only after step 2 works.
4. **Redeploy** (push any commit) so the build picks up the new production domain.
5. **Google Search Console** — add a *Domain* property (DNS TXT record), then submit `https://airadarhub.top/sitemap.xml`.
6. **Bing Webmaster Tools** — import the property from Search Console (also feeds DuckDuckGo/Yahoo).
7. GitHub → repo → Settings → Variables: `SITE_URL=https://airadarhub.top` (used in tip write-back comments; the workflow default already points there).

## Checklist after the domain is live
```bash
curl -sI https://airadarhub.top | head -1                      # 200
curl -sI https://ai-radar-lilac.vercel.app | grep -i location  # 308 → https://airadarhub.top
curl -s  https://airadarhub.top | grep -o '<link rel="canonical"[^>]*>'
curl -s  https://airadarhub.top/sitemap.xml | head -5
```
Validate structured data with Google's Rich Results Test and the Schema Markup Validator.

## What moves rankings (honest notes)
- A brand-new site needs time and links: share the site, get listed in AI newsletters/directories, and keep publishing. Technical SEO only removes obstacles.
- `.top` is treated like any other TLD by Google, but it has a spam reputation, so a clean brand, HTTPS and steady content matter more than usual.
- Content is the product: the daily editorial summaries (`summaries/*.json`) give pages unique text beyond headlines — keep that routine running.
