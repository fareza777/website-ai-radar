import type { Category, SourceType } from "../../src/lib/types";
import { truncate } from "./text";

/**
 * Deterministic Indonesian summaries used when no LLM is configured (or before the LLM
 * reaches an item). They only restate facts present in the source metadata.
 */

export const CATEGORY_LABEL_ID: Record<Category, string> = {
  model: "Model",
  feature: "Fitur",
  api: "API",
  pricing: "Harga",
  promo: "Promo",
  research: "Riset",
  developer: "Developer",
};

const BENEFIT_ID: Record<Category, string> = {
  model: "Opsi model baru untuk dicoba — bandingkan kualitas, harga, dan panjang konteks dengan model yang Anda pakai sekarang.",
  feature: "Fitur produk baru yang berpotensi langsung bisa dipakai tanpa perubahan kode.",
  api: "Perubahan API/SDK — periksa apakah integrasi Anda perlu diperbarui atau bisa memanfaatkan kapabilitas baru.",
  pricing: "Berpotensi mengubah biaya — hitung ulang estimasi biaya API/langganan Anda.",
  promo: "Peluang hemat biaya — cek syarat dan batas waktunya langsung di sumber resmi.",
  research: "Wawasan riset terbaru untuk memahami arah teknologi dan teknik yang bisa diadopsi.",
  developer: "Rilis tooling developer — perbarui untuk perbaikan bug, fitur, dan kompatibilitas terbaru.",
};

const PIPELINE_ID: Record<string, string> = {
  "text-generation": "generasi teks/LLM",
  "image-text-to-text": "multimodal (gambar + teks)",
  "text-to-image": "text-to-image",
  "image-to-image": "image-to-image",
  "text-to-video": "text-to-video",
  "image-to-video": "image-to-video",
  "text-to-speech": "text-to-speech",
  "automatic-speech-recognition": "speech recognition (ASR)",
  "feature-extraction": "embedding",
  "sentence-similarity": "embedding/kemiripan kalimat",
  "text-ranking": "reranker",
  "any-to-any": "omni/any-to-any",
  "robotics": "robotika",
  "time-series-forecasting": "peramalan time-series",
  "image-classification": "klasifikasi gambar",
  "object-detection": "deteksi objek",
  "image-segmentation": "segmentasi gambar",
  "video-text-to-text": "pemahaman video",
  "audio-text-to-text": "pemahaman audio",
  "text-classification": "klasifikasi teks",
  "translation": "terjemahan",
};

/** First meaningful sentence of the excerpt that is not just the title again. */
function firstSentence(excerpt: string, title: string): string | null {
  const text = excerpt.replace(/\s+/g, " ").trim();
  if (text.length < 30) return null;
  const withoutTitle = text.toLowerCase().startsWith(title.toLowerCase()) ? text.slice(title.length).replace(/^[\s:.–—-]+/, "") : text;
  const m = /^(.{30,220}?[.!?])(\s|$)/.exec(withoutTitle);
  const s = m ? m[1] : truncate(withoutTitle, 200);
  return s.length >= 30 ? s : null;
}

export interface TemplateInput {
  labName: string;
  title: string;
  excerpt: string;
  category: Category;
  sourceType: SourceType;
  sourceName: string;
  meta?: Record<string, string | number>;
}

export function templateSummary(input: TemplateInput): { summary: string; benefit: string } {
  const { labName, title, category, sourceType, meta } = input;
  let summary: string;
  let benefit = BENEFIT_ID[category];

  switch (sourceType) {
    case "huggingface": {
      const pipeline = meta?.pipeline ? PIPELINE_ID[String(meta.pipeline)] ?? String(meta.pipeline) : null;
      summary = `${labName} memublikasikan model ${title} di Hugging Face${pipeline ? ` untuk tugas ${pipeline}` : ""}.`;
      if (meta?.license) summary += ` Lisensi: ${meta.license}.`;
      benefit = "Bobot model bisa diunduh dan diuji langsung (self-host/fine-tune); baca model card & lisensi sebelum dipakai produksi.";
      break;
    }
    case "github-releases": {
      const kind = meta?.semver;
      const label = kind === "major" ? "rilis mayor" : kind === "minor" ? "rilis minor" : "rilis patch";
      summary = `${labName} merilis ${title} (${label}) di GitHub.`;
      benefit =
        kind === "patch"
          ? "Pembaruan kecil (perbaikan bug/peningkatan) — aman untuk di-update; cek changelog bila ada perubahan perilaku."
          : "Versi baru dengan fitur/perubahan signifikan — baca release notes untuk breaking changes sebelum upgrade.";
      break;
    }
    case "github-new-repos":
      summary = `${labName} membuat repositori publik baru: ${title}.`;
      benefit =
        category === "model"
          ? "Repo baru sering menyertai rilis model/riset — cek kode, paper, dan bobot yang terkait."
          : "Proyek open-source baru dari lab ini — bisa langsung dipelajari atau dipakai.";
      break;
    default: {
      // No LLM: frame in Indonesian and quote the source's own lead sentence instead of repeating the title.
      const lead = firstSentence(input.excerpt, title);
      summary = `Publikasi resmi ${labName} (${input.sourceName}) dengan topik ${CATEGORY_LABEL_ID[category].toLowerCase()}.${lead ? ` Cuplikan sumber: “${lead}”` : ""}`;
    }
  }
  return { summary, benefit };
}
