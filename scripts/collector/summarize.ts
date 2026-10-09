import type { Category, SourceType } from "../../src/lib/types";
import { truncate } from "./text";

/**
 * Deterministic English summaries used when no LLM is configured (or before the LLM
 * reaches an item). They only restate facts present in the source metadata/text.
 */

export const CATEGORY_LABEL: Record<Category, string> = {
  model: "Model",
  feature: "Feature",
  api: "API",
  pricing: "Pricing",
  promo: "Promo",
  research: "Research",
  developer: "Developer",
};

const BENEFIT: Record<Category, string> = {
  model: "A new model option to evaluate — compare quality, price, and context length against what you use today.",
  feature: "A new product capability you may be able to use right away, without code changes.",
  api: "API/SDK change — check whether your integration needs an update or can use the new capability.",
  pricing: "May change your costs — re-estimate your API or subscription spend.",
  promo: "A chance to save money — check the terms and deadline on the official source.",
  research: "Fresh research that signals where the technology is heading and which techniques to adopt.",
  developer: "Developer tooling release — update for the latest fixes, features, and compatibility.",
};

const PIPELINE: Record<string, string> = {
  "text-generation": "text generation (LLM)",
  "image-text-to-text": "multimodal (image + text)",
  "feature-extraction": "embeddings",
  "sentence-similarity": "embeddings / sentence similarity",
  "text-ranking": "reranking",
  "automatic-speech-recognition": "speech recognition (ASR)",
  "any-to-any": "omni / any-to-any",
  "time-series-forecasting": "time-series forecasting",
  "video-text-to-text": "video understanding",
  "audio-text-to-text": "audio understanding",
};

/** First meaningful sentence of the excerpt that is not just the title again. */
function firstSentence(excerpt: string, title: string): string | null {
  const text = excerpt.replace(/\s+/g, " ").trim();
  if (text.length < 30) return null;
  const withoutTitle = text.toLowerCase().startsWith(title.toLowerCase()) ? text.slice(title.length).replace(/^[\s:.–—-]+/, "") : text;
  const m = /^(.{30,240}?[.!?])(\s|$)/.exec(withoutTitle);
  const s = m ? m[1] : truncate(withoutTitle, 220);
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
  let benefit = BENEFIT[category];

  switch (sourceType) {
    case "huggingface": {
      const raw = meta?.pipeline ? String(meta.pipeline) : null;
      const pipeline = raw ? PIPELINE[raw] ?? raw.replace(/-/g, " ") : null;
      summary = `${labName} published the ${title} model on Hugging Face${pipeline ? ` for ${pipeline}` : ""}.`;
      if (meta?.license) summary += ` License: ${meta.license}.`;
      benefit = "Weights are downloadable for self-hosting or fine-tuning — read the model card and license before production use.";
      break;
    }
    case "github-releases": {
      const kind = meta?.semver;
      const label = kind === "major" ? "major release" : kind === "minor" ? "minor release" : "patch release";
      summary = `${labName} shipped ${title} (${label}) on GitHub.`;
      benefit =
        kind === "patch"
          ? "Small update (fixes/improvements) — generally safe to upgrade; skim the changelog for behavior changes."
          : "New version with notable changes — read the release notes for breaking changes before upgrading.";
      break;
    }
    case "github-new-repos":
      summary = `${labName} created a new public repository: ${title}.`;
      benefit =
        category === "model"
          ? "New repos often accompany model or research releases — check the code, paper, and weights."
          : "A new open-source project from this lab that you can study or use right away.";
      break;
    default: {
      // No LLM: use the source's own lead sentence (already English) instead of repeating the title.
      const lead = firstSentence(input.excerpt, title);
      summary = lead ?? `Official ${CATEGORY_LABEL[category].toLowerCase()} update from ${labName} (${input.sourceName}).`;
    }
  }
  return { summary, benefit };
}
