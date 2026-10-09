# Cursor daily prompt (copy–paste)

**Jadwal yang disarankan:** 1× sehari, **08:00 WIB** (tepat setelah run GitHub Actions pukul 07:17 WIB).
**Repo:** `fareza777/website-ai-radar`, branch `main`. Agent butuh akses push ke repo dan akses web search.

Tempel teks di bawah ini apa adanya sebagai prompt tugas terjadwal di Cursor:

```text
Run the AI Radar daily run: follow .cursor/rules/daily-update.mdc exactly, all steps in order
(collect, fix sources, find up to 5 AI startups buzzing on X as tips, write summaries until
summaries:check passes, check deals, validate), then commit and push DIRECTLY to main
(git push origin HEAD:main) — no branch, no pull request. End with a short report.
Never edit data/ by hand, never invent facts, never scrape X.
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
| 8–10 | Validasi, commit, **push langsung ke main**, laporan | Vercel deploy otomatis |

> Jika lingkungan Cursor memaksa membuat PR, workflow **Auto-merge daily Cursor run** otomatis memvalidasi & merge PR dari branch `cursor/*` ke `main` (hanya jika file yang diubah ada di `data/`, `summaries/`, atau `src/config/{tips.json,labs.ts,deals.ts}`), lalu menjalankan collector Discover.

## Pengaman otomatis

- Ringkasan divalidasi `npm run summaries:check` (juga di CI): ID harus ada, konten sumber belum berubah, panjang wajar,
  tanpa URL, dan **setiap angka harus ada di teks sumber**. Ringkasan yang tidak lolos tidak ditampilkan.
- Tip dari Cursor hanya tampil bila halaman produknya benar-benar bisa dimuat; nama & deskripsi diambil dari halaman itu.
- Tip dari Cursor berlabel **Agent pick**, berbeda dari tip Anda sendiri (**Editor's pick**).
