# Konfigurasi Sumber Data

Semua sumber didefinisikan sebagai kode TypeScript (ter-type-check), bukan di database. Mengubah sumber = edit file, commit, dan run berikutnya memakai konfigurasi baru.

## 1. Lab & sumbernya — `src/config/labs.ts`

Setiap lab:

```ts
{
  slug: "openai",                 // URL /labs/openai dan nama file data/updates/openai.json
  name: "OpenAI",
  tagline: "ChatGPT · GPT · Codex · Sora",
  website: "https://openai.com",
  domains: ["openai.com", "chatgpt.com", "github.com/openai"],  // untuk status "Resmi"
  color: "#10a37f",               // aksen glow/sparkline
  logo: "openai",                 // kunci di src/components/logos/data.ts
  coverage: "full",               // full | mirror | partial (ditampilkan transparan)
  coverageNote: "…",
  sources: [ … ],
}
```

### Tipe sumber

| Helper | `type` | `target` | Catatan |
| --- | --- | --- | --- |
| `rss(id, name, url)` | `rss` | URL RSS/Atom/RDF | Feed resmi lab (`trust: "official"`) |
| `mirror(id, name, file)` | `rss` | nama file di Olshansk/rss-feeds | Untuk lab tanpa RSS. `trust: "mirror"`; link item tetap ke domain resmi |
| `hf(id, author, minLikes)` | `huggingface` | org Hugging Face | Model baru. Varian kuantisasi (GGUF/AWQ/FP8/MLX…) otomatis dibuang |
| `gh(id, "owner/repo", { label })` | `github-releases` | repo | Via `releases.atom` (tanpa token). Pre-release dibuang. Patch/minor/major diberi bobot berbeda |
| `ghNew(id, owner)` | `github-new-repos` | user/org GitHub | Repo publik baru (sering menyertai rilis model/riset) |

Opsi tambahan per sumber: `include` / `exclude` (regex case-insensitive pada judul+cuplikan), `minLikes` (HF), `limit` (maks item per run), `label` (nama produk untuk rilis GitHub).

### Menambah sumber

1. Pastikan URL benar-benar resmi dan bisa diambil tanpa login: `curl -sL <url> | head`.
2. Tambahkan ke array `sources` lab terkait dengan `id` unik (test memeriksa keunikan).
3. Jalankan `npm run collect -- --only=labs --lab=<slug>` dan periksa `data/updates/<slug>.json`.
4. Jalankan `npm test` lalu commit.

### Menambah lab baru

1. Tambah logo SVG ke `public/logos/<logo>.svg` → `npm run build:logos`.
2. Tambah objek lab di `LABS`. Halaman `/labs/<slug>`, sitemap, search, dan status otomatis mengikuti.
3. Perbarui tes jumlah lab di `tests/collector.test.ts` jika jumlahnya berubah.

### Menghapus sumber

Hapus dari `sources`. Item lama dari `id` sumber itu otomatis dibersihkan pada run berikutnya (contoh: repo yang pindah kepemilikan sehingga tidak lagi resmi).

## 2. Aturan pipeline (ringkas)

- **Tanggal**: hanya dari sumber (pubDate/published/updated/createdAt). Item tanpa tanggal valid **dilewati**, tidak ditebak. Tanggal >2 hari di masa depan ditolak.
- **Identitas**: `id = sha1(URL kanonik)` (https, tanpa www, tanpa utm/hash, tanpa trailing slash).
- **Perubahan konten**: hash judul+cuplikan; jika berubah → `updatedAt` diperbarui dan UI menampilkan "diperbarui …".
- **Dedupe lintas sumber**: judul mirip (Jaccard ≥ 0.72) dalam 3 hari → digabung; sumber prioritas tertinggi (RSS resmi > mirror > GitHub > HF) menang, lainnya di `seenIn`.
- **Klasifikasi** (rule-based, deterministik): Model, Feature, API, Pricing, Promo, Research, Developer. Diterapkan ulang ke seluruh histori setiap run sehingga perbaikan aturan langsung berlaku.
- **Ranking** 0–100: kategori, sumber resmi, lab frontier, kata kunci peluncuran, likes HF, jenis versi rilis; tutorial/customer story diturunkan. "Important" = ≥ 65.
- **Verifikasi**: `verified = true` jika link mengarah ke `domains` lab.
- **Histori**: item tidak pernah dihapus karena sumber gagal. Maks 600 item per lab di file (histori lebih lama ada di git).
- **Lab sepi**: jika tidak ada item dalam jendela 90 hari, collector mengambil maks 5 rilis riil terakhir (≤ 1 tahun).

## 3. Discover — `src/config/discover.ts`

- `github.queries`: query GitHub Search untuk repo yang dibuat ≤ 30 hari dengan stars ≥ 150.
- `hackernews`: story AI (≥ 60 poin) dan Show HN (≥ 15 poin) 10 hari terakhir. Link GitHub di HN diperkaya metadata repo; berita biasa (bukan produk) tidak dimasukkan.
- `watchlist`: repo yang selalu dipantau (contoh: `antseed/antseed`) — tetap divalidasi live ke GitHub API.
- **Baru vs trending**: dibuat/diluncurkan ≤ 60 hari = "Benar-benar baru"; lebih lama hanya masuk jika punya momentum (lonjakan stars ≥ 300/minggu dari histori stars, masuk HN/PH, atau watchlist).
- **Harga**: hanya dari fakta (lisensi open-source). Produk non-OSS ditandai "Belum diverifikasi — cek halaman harga resmi".

## 4. Deals — `src/config/deals.ts`

- `CURATED_DEALS`: setiap entri wajib punya `url` resmi dan `mustContain` (regex). Collector mengambil halaman setiap run; status **aktif** hanya jika teks ditemukan, dan kutipannya disimpan sebagai bukti. Gunakan `?hl=en` untuk halaman yang dilokalisasi berdasarkan IP.
- OpenRouter: model dengan harga input & output = 0 diambil live, termasuk `expiration_date`. Model yang hilang dari daftar gratis ditandai kedaluwarsa (disimpan 14 hari untuk transparansi).
- Pengumuman promo/harga dari feed resmi lab → status "Diumumkan resmi".
- Hacker News → status "Belum diverifikasi".
- Status kedaluwarsa dihitung ulang di browser berdasarkan `endsAt`.

## 5. Output data

| File | Isi |
| --- | --- |
| `data/updates/<slug>.json` | `UpdateItem[]` per lab, terbaru di atas |
| `data/discover.json` | `DiscoverItem[]` diurutkan skor |
| `data/deals.json` | `Deal[]` |
| `data/briefings.json` | Briefing harian (30 hari terakhir, tanggal WIB) |
| `data/status.json` | Waktu run, status LLM, status setiap sumber |

Kontrak tipe: `src/lib/types.ts`.
