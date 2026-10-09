# Cursor daily prompt (copy–paste)

**Jadwal yang disarankan:** 1× sehari, **08:00 WIB** (tepat setelah run GitHub Actions pukul 07:17 WIB).
**Repo:** `fareza777/website-ai-radar`, branch `main`. Agent butuh akses push ke repo dan akses web search.

Tempel teks di bawah ini apa adanya sebagai prompt tugas terjadwal di Cursor:

```text
You are the daily editor and maintainer of AI Radar (this repository).

First read these files completely and follow them exactly:
- .cursor/rules/daily-update.mdc   (the step-by-step daily procedure)
- .cursor/rules/ai-radar.mdc       (project rules)

Then run the full daily procedure, all steps in order:
1. Sync: git pull --rebase, npm ci.
2. Collect: npm run collect.
3. Fix any failing sources in data/status.json (ok=false and not skipped) using official URLs only.
4. X buzz research: use web search to find up to 5 AI startups/tools that launched or are being talked about on X in the last
   48 hours. For each, confirm the product's own site (or GitHub repo) loads and find the X post URL. Skip products of the
   20 tracked labs, news articles, crypto token promos, NSFW, and anything already in data/discover.json. Add each with:
   npm run tip -- --x <x post url> --url <product url> --note "<one factual line>" --by cursor
   then run: npm run collect -- --only=discover
5. Summaries: npm run summaries:pending, then write English entries for ALL pending items into summaries/updates.json,
   summaries/discover.json and summaries/briefing.json, following the writing rules (facts only from pending.json, every
   number must appear in the source text, no URLs, no hype). Make "benefit" (shown as "Why it matters") specific and
   practical for each item. Run npm run summaries:check -- --prune and fix until 0 errors.
6. Deals: re-check curated deals with status "unverified"; fix mustContain or remove ended offers in src/config/deals.ts.
7. Mondays only: look for new official RSS/changelog feeds for labs with coverage "partial".
8. Validate: npm test && npm run lint && npm run typecheck && npm run summaries:check && npm run build — all must pass.
9. Commit and push: git add summaries src/config data, commit "chore(daily): summaries, tips, data <YYYY-MM-DD>", push
   (on rejection: git pull --rebase, resolve data/ conflicts with the remote version, re-run summaries:check, push).
10. Finish with a short report: items collected, failing sources and fixes, tips added (name + URL, live or not),
    summaries written per file, deal changes, build result.

Hard rules: never hand-edit data/**/*.json; never invent news, products, dates, prices, numbers or quotes; never scrape or
log in to X; only write to summaries/*.json, src/config/tips.json (via npm run tip), src/config/labs.ts, src/config/deals.ts;
do not change application code, workflows or tests.
```

## Apa yang dikerjakan Cursor setiap hari

| # | Tugas | Hasil di website |
|---|---|---|
| 1–2 | Sinkron + ambil data terbaru | Feed segar |
| 3 | Perbaiki sumber yang error | Coverage tetap penuh |
| 4 | **Riset X**: cari ≤5 startup/tool AI yang ramai, kirim sebagai tip | Muncul di Discover dengan label **Agent pick** + kutipan post X |
| 5 | **Tulis ringkasan** untuk semua update baru, item Discover, dan Daily Briefing | Ringkasan & "Why it matters" spesifik, briefing editorial |
| 6 | Cek ulang deals yang belum terverifikasi | Deals tetap akurat |
| 7 | (Senin) cari feed resmi baru untuk lab berstatus Partial | Coverage naik |
| 8–10 | Validasi, commit, push, laporan | Vercel deploy otomatis |

## Pengaman otomatis

- Ringkasan divalidasi `npm run summaries:check` (juga di CI): ID harus ada, konten sumber belum berubah, panjang wajar,
  tanpa URL, dan **setiap angka harus ada di teks sumber**. Ringkasan yang tidak lolos tidak ditampilkan.
- Tip dari Cursor hanya tampil bila halaman produknya benar-benar bisa dimuat; nama & deskripsi diambil dari halaman itu.
- Tip dari Cursor berlabel **Agent pick**, berbeda dari tip Anda sendiri (**Editor's pick**).
