# Panduan Update Harian dengan Cursor

> **Prompt siap tempel untuk jadwal harian Cursor ada di [`docs/CURSOR_DAILY_PROMPT.md`](CURSOR_DAILY_PROMPT.md).** Prosedur lengkap yang diikuti agent: [`.cursor/rules/daily-update.mdc`](../.cursor/rules/daily-update.mdc).

Dokumen ini untuk menjalankan update harian AI Radar memakai **Cursor** (Agent / Background Agent / automasi terjadwal). Aturan proyek untuk agent Cursor ada di `.cursor/rules/` dan otomatis dibaca Cursor.

## Pembagian tugas

| Siapa | Kapan | Tugas |
| --- | --- | --- |
| **GitHub Actions** (`collect.yml`) | tiap 3 jam, otomatis | Mengambil data, commit `data/`, memicu deploy Vercel |
| **Cursor** (panduan ini) | 1× sehari | *Perawatan*: menjalankan collector, memperbaiki sumber yang gagal, memverifikasi deals, menambah sumber resmi baru, memastikan build hijau |

Cursor **tidak** menulis berita/ringkasan/promo secara manual. Semua isi `data/` hanya boleh berasal dari `npm run collect`.

## Persiapan sekali saja

1. Clone repo dan buka foldernya di Cursor.
2. `npm install`
3. Buat `.env.local` dari `.env.example` (opsional: `GITHUB_TOKEN`, `LLM_API_KEY`).
4. Pastikan Cursor punya akses push ke repo (untuk background agent: hubungkan GitHub di pengaturan Cursor).

## Prompt siap pakai (tempel ke Cursor Agent / jadwal harian)

```
Jalankan rutinitas harian AI Radar sesuai .cursor/rules/daily-update.mdc dan docs/CURSOR_GUIDE.md.
Aturan keras: jangan pernah mengedit data/*.json secara manual atau mengarang berita, tanggal, harga, atau promo.
Langkah:
1) git pull --rebase
2) npm ci
3) npm run collect  (pakai GITHUB_TOKEN dari environment bila ada)
4) Baca baris "Done ..." dan data/status.json. Untuk setiap sumber ok=false (abaikan skipped=true):
   cek URL dengan curl; jika pindah ke URL resmi baru, perbarui src/config/labs.ts; jika tidak bisa diperbaiki, biarkan dan laporkan.
5) Cek data/deals.json: deal kurasi berstatus "unverified" → buka halaman resminya; perbarui mustContain bila teks berubah,
   atau hapus entri jika programnya sudah berakhir. Jangan pernah memaksa status "active".
6) npm test && npm run lint && npm run typecheck && npm run build — semua harus lulus.
7) Commit: "chore(data): daily update YYYY-MM-DD" (hanya data) atau "fix(sources): ..." (perubahan config). Push ke main.
8) Tulis ringkasan: jumlah item, sumber gagal + tindakan, perubahan config, hasil build.
```

## Rutinitas detail

### 1. Sinkronisasi
```bash
git pull --rebase
npm ci
```
Bot GitHub Actions commit tiap 3 jam, jadi selalu pull dulu.

### 2. Jalankan collector
```bash
npm run collect
```
Output akhir contoh: `Done in 70s · sources ok=76 failed=0 skipped=1 · items=583`.
- `skipped` = sumber opsional tanpa token (mis. Product Hunt) — normal.
- `failed` > 0 → lanjut langkah 3.

### 3. Perbaiki sumber yang gagal
Cari di `data/status.json` entri `"ok": false` tanpa `"skipped": true`.

| Error | Tindakan |
| --- | --- |
| `HTTP 404/410` | URL feed pindah. Cari feed resmi baru di situs lab (`<link rel="alternate" type="application/rss+xml">`). Update `target` di `src/config/labs.ts`. |
| `HTTP 403/429` | Rate limit/blokir sementara. Jangan ubah apa pun; cek lagi besok. |
| `Unrecognized feed format` | URL mengembalikan HTML. Cari URL RSS yang benar. |
| Timeout | Biarkan; retry otomatis di run berikutnya. |

Aturan: hanya sumber **resmi** (domain/org milik lab). Mirror komunitas hanya boleh dipakai jika lab tidak punya RSS, dan wajib `trust: "mirror"` lewat helper `mirror()`. Jangan pernah scraping X/Twitter.

Verifikasi perbaikan:
```bash
npm run collect -- --only=labs --lab=<slug>
```

### 4. Verifikasi deals
- Deal kurasi (`src/config/deals.ts`) berstatus `unverified` → buka `url`. Jika program masih ada tapi teks berubah, sesuaikan `mustContain` dengan teks yang **benar-benar ada** di halaman. Jika program berakhir, hapus entrinya.
- Menambah deal baru: wajib URL resmi + `mustContain` yang dapat dicek. Jalankan `npm run collect -- --only=deals` dan pastikan statusnya `active` dengan `evidence` yang masuk akal.
- Jika halaman berbahasa lain (dilokalisasi IP), tambahkan `?hl=en` atau parameter bahasa yang setara.

### 5. (Opsional) Tingkatkan coverage
Lab berstatus `partial` (DeepSeek, Qwen, Kimi, GLM, MiniMax, Baidu, Tencent, ByteDance, AI21): periksa apakah sudah ada RSS/changelog resmi. Jika ada, tambahkan dengan `rss(...)` dan ubah `coverage` + `coverageNote`. Lihat `docs/SOURCES.md`.

### 6. Validasi
```bash
npm test
npm run lint
npm run typecheck
npm run build
```
Semua wajib lulus sebelum commit. Jika test klasifikasi gagal setelah mengubah aturan di `scripts/collector/classify.ts`, perbaiki aturannya — jangan menghapus test.

### 7. Commit & push
```bash
git add -A
git commit -m "chore(data): daily update 2026-10-10"
git push
```
Jika push ditolak karena bot baru saja commit:
```bash
git pull --rebase
# konflik di data/*.json? jangan merge manual — ambil versi remote lalu kumpulkan ulang:
git checkout --theirs data && git add data && git rebase --continue
npm run collect && git add data && git commit -m "chore(data): daily update" && git push
```

## Menambah startup yang Anda lihat di X (tip)

Contoh: Anda melihat post tentang AntSeed di X.

- **Dari HP/browser:** buka `/submit` di AI Radar → tempel link post X (+ URL produk) → *Send tip via GitHub* → *Create*. Issue memicu collector; dalam beberapa menit item muncul di Discover dan bot membalas "✅ Added".
- **Dari Cursor:** minta agent menjalankan
  ```bash
  npm run tip -- --x https://x.com/user/status/123 --url https://produk.com --note "kenapa menarik"
  npm run collect -- --only=discover
  ```
  lalu commit `src/config/tips.json` + `data/`.
- Nama & deskripsi selalu diambil dari halaman produk itu sendiri; jika halaman tidak bisa dimuat, tip tidak dipublikasikan (bot memberi label `needs-info`).

## Checklist akurasi (wajib)

- [ ] Tidak ada edit manual pada `data/*.json`.
- [ ] Tidak ada berita/tanggal/harga/promo yang dikarang.
- [ ] Sumber baru = resmi (atau mirror berlabel).
- [ ] Deal hanya `active` bila bukti ditemukan otomatis.
- [ ] `npm test`, `lint`, `typecheck`, `build` lulus.
- [ ] Ringkasan akhir menyebut sumber yang gagal & tindakannya.
