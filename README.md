# AI Radar — Your AI Intelligence Hub

Platform pemantau perkembangan AI global yang **otomatis**: update dari 20 lab LLM, model baru, coding agents, promo & free credits, startup dan tools AI baru — dalam satu website yang cepat, modern, dan mobile-friendly.

> Prinsip utama: **tidak ada data fiktif.** Semua item berasal dari sumber publik (RSS/blog resmi, GitHub, Hugging Face, Hacker News, OpenRouter API). Jika sumber gagal, data valid terakhir tetap tampil dan statusnya terlihat transparan di `/status`.

## Fitur

| Halaman | Isi |
| --- | --- |
| **Today** `/` | AI Daily Briefing, statistik, Global Feed kronologis 20 lab dengan filter Today / 7 Hari / 30 Hari / Important Only / Unread, kategori, lab, sort Terbaru/Terpenting |
| **AI Labs** `/labs` | Grid 20 kartu lab + logo, sparkline aktivitas 30 hari, badge "N baru" sejak kunjungan terakhir, status coverage |
| **Lab detail** `/labs/[slug]` | Timeline lengkap (terbaru di atas): tanggal/jam, judul, ringkasan Indonesia, kategori, manfaat praktis, link sumber, status verifikasi, tanggal pembaruan; filter kategori, pencarian, rentang waktu, pagination; status setiap sumber |
| **Discover** `/discover` | Opportunity Radar: repo GitHub baru, Show HN, Product Hunt (opsional), watchlist — fungsi, keunikan, manfaat, harga, alasan layak dilirik; membedakan **benar-benar baru** vs **lama tapi trending** |
| **Deals** `/deals` | Free tier & program resmi (diverifikasi ulang tiap run dengan kutipan bukti), model gratis live dari OpenRouter (lengkap tanggal berakhir), pengumuman promo lab, sinyal komunitas (ditandai belum diverifikasi) |
| **Saved** `/saved` | Bookmark (localStorage, tanpa akun) |
| **Status** `/status` | Coverage per lab, kesehatan setiap sumber, status LLM |

Plus: global search **⌘K / Ctrl+K / `/`**, dark/light mode, read/unread & last-visited (localStorage), SEO (metadata, sitemap, robots, OG image, JSON-LD).

## Arsitektur

```
GitHub Actions (cron tiap 3 jam)
  └─ npm run collect  ──►  data/*.json  ──► git commit ──► Vercel auto-deploy (static)
        │
        ├─ Labs: RSS/Atom · Hugging Face API · GitHub Releases (Atom) · GitHub repo baru
        │     normalisasi tanggal → dedupe lintas sumber → klasifikasi → ranking → ringkasan
        ├─ Discover: GitHub Search · Hacker News (Algolia) · Product Hunt* · watchlist
        ├─ Deals: verifikasi halaman resmi · OpenRouter models API · promo dari feed lab · HN
        └─ Briefing harian (template; LLM* opsional)            * = opsional via env
```

- **Next.js 16 App Router** (Cache Components), **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**, **Lucide**.
- Semua halaman **di-prerender statis** dari `data/*.json` → sangat cepat & hemat (tanpa database, tanpa API runtime).
- Waktu relatif ("3 jam lalu"), unread, dan bookmark dihitung di browser.

## Quick start

```bash
npm install
npm run collect        # ambil data riil (±1 menit). Opsional: GITHUB_TOKEN=... untuk rate limit lebih tinggi
npm run dev            # http://localhost:3000
```

Perintah lain:

| Script | Fungsi |
| --- | --- |
| `npm run collect` | Collector penuh (labs + discover + deals + briefing) |
| `npm run collect -- --only=labs --lab=openai` | Satu stage / satu lab |
| `npm run collect -- --backfill-days=90` | Jendela waktu penerimaan item |
| `npm test` | Unit test pipeline (parser, normalisasi, dedupe, klasifikasi) |
| `npm run lint` · `npm run typecheck` | Kualitas kode |
| `npm run build` | Build produksi (otomatis membuat `public/search-index.json`) |
| `npm run build:logos` | Regenerasi logo inline dari `public/logos/*.svg` |

## Environment variables

Lihat [`.env.example`](.env.example).

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `GITHUB_TOKEN` | Tidak (otomatis di Actions) | Menaikkan limit GitHub API untuk Discover |
| `LLM_API_KEY` | Tidak | Aktifkan ringkasan/analisis Bahasa Indonesia via LLM murah |
| `LLM_BASE_URL` | Tidak | Endpoint OpenAI-compatible (default OpenRouter) |
| `LLM_MODEL` | Tidak | Default `deepseek/deepseek-v4-flash` |
| `LLM_MAX_ITEMS` | Tidak | Batas item yang diringkas per run (default 40) — kontrol biaya |
| `PRODUCT_HUNT_TOKEN` | Tidak | Sumber Product Hunt di Discover |
| `NEXT_PUBLIC_SITE_URL` | Tidak | URL absolut untuk SEO (Vercel otomatis memakai domain produksi) |

**Hemat API:** LLM hanya dipanggil untuk item baru (≤14 hari) yang belum punya ringkasan LLM, diproses per batch 8, dan hasilnya disimpan permanen di JSON — item yang sama tidak pernah diringkas dua kali. Tanpa LLM, ringkasan memakai template Indonesia + cuplikan sumber.

## Workflow otomatis

- [`.github/workflows/collect.yml`](.github/workflows/collect.yml) — cron `17 */3 * * *` (tiap 3 jam) + tombol manual (**Actions → Collect AI updates → Run workflow**). Menjalankan test, collector, validasi JSON, lalu commit `data/` (retry + rebase). Commit memicu deploy Vercel.
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — lint, typecheck, test, build untuk PR & push kode.

Secrets/variables (Settings → Secrets and variables → Actions):
- Secrets: `LLM_API_KEY`, `PRODUCT_HUNT_TOKEN` (keduanya opsional)
- Variables: `LLM_BASE_URL`, `LLM_MODEL`, `LLM_MAX_ITEMS` (opsional)

## Konfigurasi sumber

Semua sumber ada di satu tempat dan mudah diubah:

- [`src/config/labs.ts`](src/config/labs.ts) — 20 lab + sumber per lab (RSS, Hugging Face, GitHub Releases, GitHub repo baru), filter include/exclude, domain resmi untuk verifikasi.
- [`src/config/discover.ts`](src/config/discover.ts) — query GitHub, ambang HN, watchlist repo.
- [`src/config/deals.ts`](src/config/deals.ts) — program free tier/kredit + teks bukti wajib (`mustContain`).

Panduan lengkap: [`docs/SOURCES.md`](docs/SOURCES.md). Panduan update harian dengan Cursor: [`docs/CURSOR_GUIDE.md`](docs/CURSOR_GUIDE.md).

## Coverage saat ini

| Coverage | Lab |
| --- | --- |
| **Feed resmi** (RSS/blog resmi + GitHub/HF) | OpenAI, Google DeepMind, Microsoft, Amazon, NVIDIA, IBM |
| **Via mirror** (lab tanpa RSS → mirror komunitas halaman resmi + GitHub/HF resmi) | Anthropic, xAI, Meta, Mistral, Cohere |
| **Parsial** (tanpa blog yang bisa dibaca mesin → Hugging Face + GitHub resmi) | DeepSeek, Qwen, Moonshot Kimi, Z.ai GLM, MiniMax, Baidu, Tencent, ByteDance, AI21 |

X/Twitter tidak di-scrape. Lab tanpa update dalam 90 hari menampilkan rilis riil terakhirnya (maks 1 tahun) agar semua 20 kartu tetap berisi.

## Struktur proyek

```
src/app/            halaman (Today, labs, discover, deals, saved, status) + sitemap/robots/OG
src/components/     UI (kartu update, timeline, grid lab, search ⌘K, filter, tema)
src/config/         registry sumber: labs.ts, discover.ts, deals.ts
src/lib/            tipe data, loader data (server), format, storage (localStorage)
scripts/collect.ts  entrypoint collector
scripts/collector/  http, feed parser, sources, merge/dedupe, classify, summarize, llm, discover, deals, briefing
data/               output collector (di-commit): updates/<lab>.json, discover.json, deals.json, briefings.json, status.json
tests/              unit test pipeline (vitest)
```

## Deploy ke Vercel

1. Import repo ini di Vercel (Framework: Next.js, tanpa konfigurasi tambahan).
2. (Opsional) set `NEXT_PUBLIC_SITE_URL` bila memakai domain kustom.
3. Setiap commit data dari GitHub Actions otomatis memicu deploy ulang.

## Lisensi & atribusi

Logo lab dari [@lobehub/icons](https://github.com/lobehub/lobe-icons) (MIT) — merek dagang milik pemiliknya masing-masing. Mirror RSS komunitas: [Olshansk/rss-feeds](https://github.com/Olshansk/rss-feeds).
