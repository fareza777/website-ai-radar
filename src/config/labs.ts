import type { LabConfig, SourceConfig } from "@/lib/types";

/**
 * SOURCE REGISTRY — the single place to add/edit monitored sources.
 *
 * Source types:
 *  - rss               target = RSS/Atom URL
 *  - huggingface       target = HF author/org (new model repos via public API)
 *  - github-releases   target = "owner/repo" (via public releases.atom feed)
 *  - github-new-repos  target = GitHub user/org (newly created public repos)
 *
 * trust: "official" when the feed/org belongs to the lab, "mirror" when it is a
 * community-maintained mirror of an official page (item links still point to the lab).
 * See docs/SOURCES.md for how to add a source.
 */

const MIRROR = "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/";

// Drop quantized / format-conversion uploads so HF timelines show real model releases.
const HF_VARIANT_EXCLUDE =
  "(gguf|awq|gptq|fp8|fp4|nvfp4|mxfp\\d|int4|int8|w4a16|w8a8|bnb|mlx|onnx|exl2|eagle|-bf16|-4bit|-8bit|quantized)";

const rss = (id: string, name: string, target: string, extra: Partial<SourceConfig> = {}): SourceConfig => ({
  id, type: "rss", name, target, trust: "official", ...extra,
});
const mirror = (id: string, name: string, file: string, extra: Partial<SourceConfig> = {}): SourceConfig => ({
  id, type: "rss", name, target: MIRROR + file, trust: "mirror", ...extra,
});
const hf = (id: string, author: string, minLikes = 0, extra: Partial<SourceConfig> = {}): SourceConfig => ({
  id, type: "huggingface", name: `Hugging Face · ${author}`, target: author, trust: "official",
  minLikes, exclude: HF_VARIANT_EXCLUDE, limit: 40, ...extra,
});
const gh = (id: string, repo: string, extra: Partial<SourceConfig> = {}): SourceConfig => ({
  id, type: "github-releases", name: `GitHub · ${repo}`, target: repo, trust: "official", limit: 6, ...extra,
});
const ghNew = (id: string, owner: string, extra: Partial<SourceConfig> = {}): SourceConfig => ({
  id, type: "github-new-repos", name: `GitHub · ${owner} (repo baru)`, target: owner, trust: "official", limit: 8, ...extra,
});

export const LABS: LabConfig[] = [
  {
    slug: "openai", name: "OpenAI", tagline: "ChatGPT · GPT · Codex · Sora", website: "https://openai.com",
    domains: ["openai.com", "chatgpt.com", "github.com/openai", "huggingface.co/openai"], color: "#10a37f", logo: "openai",
    coverage: "full", coverageNote: "RSS resmi openai.com + GitHub Releases + Hugging Face.",
    sources: [
      rss("openai-news", "OpenAI News (RSS)", "https://openai.com/news/rss.xml"),
      mirror("openai-dev", "OpenAI Developer Blog", "feed_openai_developer.xml"),
      gh("openai-codex", "openai/codex", { label: "Codex CLI" }),
      gh("openai-agents", "openai/openai-agents-python", { limit: 4, label: "OpenAI Agents SDK" }),
      hf("openai-hf", "openai"),
    ],
  },
  {
    slug: "anthropic", name: "Anthropic", tagline: "Claude · Claude Code · MCP", website: "https://www.anthropic.com",
    domains: ["anthropic.com", "claude.com", "claude.ai", "claude.dev", "github.com/anthropics"], color: "#d97757", logo: "anthropic",
    coverage: "mirror", coverageNote: "Anthropic tidak menyediakan RSS resmi; memakai mirror komunitas dari halaman resmi + GitHub Releases resmi.",
    sources: [
      mirror("anthropic-news", "Anthropic News", "feed_anthropic_news.xml"),
      mirror("anthropic-claude-blog", "Claude Blog", "feed_claude.xml"),
      mirror("anthropic-eng", "Anthropic Engineering", "feed_anthropic_engineering.xml"),
      gh("anthropic-claude-code", "anthropics/claude-code", { label: "Claude Code" }),
      gh("anthropic-agent-sdk", "anthropics/claude-agent-sdk-python", { limit: 4, label: "Claude Agent SDK (Python)" }),
    ],
  },
  {
    slug: "google-deepmind", name: "Google DeepMind", tagline: "Gemini · Gemma · Veo", website: "https://deepmind.google",
    domains: ["deepmind.google", "blog.google", "ai.google.dev", "developers.googleblog.com", "github.com/google-gemini", "github.com/googleapis", "huggingface.co/google"],
    color: "#4285f4", logo: "google-deepmind",
    coverage: "full", coverageNote: "RSS resmi DeepMind & Google Blog + GitHub Releases + Hugging Face.",
    sources: [
      rss("deepmind-blog", "Google DeepMind Blog", "https://deepmind.google/blog/rss.xml"),
      rss("google-ai-blog", "Google Blog · AI", "https://blog.google/technology/ai/rss/"),
      rss("google-dev-blog", "Google Blog · Developers", "https://blog.google/technology/developers/rss/", { include: "(gemini|ai studio|gemma|agent|model|ai)" }),
      gh("gemini-cli", "google-gemini/gemini-cli", { label: "Gemini CLI" }),
      gh("google-genai-sdk", "googleapis/python-genai", { limit: 3, label: "Google GenAI SDK (Python)" }),
      hf("google-hf", "google", 15),
    ],
  },
  {
    slug: "xai", name: "xAI", tagline: "Grok · Grok API", website: "https://x.ai",
    domains: ["x.ai", "grok.com", "github.com/xai-org", "huggingface.co/xai-org"], color: "#8b8b8b", logo: "xai",
    coverage: "mirror", coverageNote: "Tanpa RSS resmi; mirror komunitas halaman x.ai/news + GitHub & Hugging Face resmi.",
    sources: [
      mirror("xai-news", "xAI News", "feed_xainews.xml"),
      gh("xai-sdk", "xai-org/xai-sdk-python", { limit: 4, label: "xAI SDK (Python)" }),
      hf("xai-hf", "xai-org"),
    ],
  },
  {
    slug: "deepseek", name: "DeepSeek", tagline: "DeepSeek V · R · API", website: "https://www.deepseek.com",
    domains: ["deepseek.com", "api-docs.deepseek.com", "github.com/deepseek-ai", "huggingface.co/deepseek-ai"], color: "#4d6bfe", logo: "deepseek",
    coverage: "partial", coverageNote: "Tanpa blog/RSS resmi; rilis dipantau dari Hugging Face & GitHub resmi deepseek-ai.",
    sources: [hf("deepseek-hf", "deepseek-ai"), ghNew("deepseek-gh", "deepseek-ai")],
  },
  {
    slug: "qwen", name: "Alibaba Qwen", tagline: "Qwen · Qwen Code · Qwen-Image", website: "https://qwen.ai",
    domains: ["qwen.ai", "qwenlm.github.io", "alibabacloud.com", "github.com/QwenLM", "huggingface.co/Qwen"], color: "#615ced", logo: "qwen",
    coverage: "partial", coverageNote: "Blog Qwen (RSS) + Hugging Face Qwen + GitHub QwenLM.",
    sources: [
      rss("qwen-blog", "Qwen Blog (RSS)", "https://qwenlm.github.io/blog/index.xml"),
      hf("qwen-hf", "Qwen", 5),
      gh("qwen-code", "QwenLM/qwen-code", { label: "Qwen Code" }),
      ghNew("qwen-gh", "QwenLM"),
    ],
  },
  {
    slug: "moonshot", name: "Moonshot Kimi", tagline: "Kimi · Kimi K · Kimi CLI", website: "https://www.moonshot.ai",
    domains: ["moonshot.ai", "moonshot.cn", "kimi.com", "github.com/MoonshotAI", "huggingface.co/moonshotai"], color: "#1783ff", logo: "moonshot",
    coverage: "partial", coverageNote: "Tanpa RSS resmi; Hugging Face moonshotai + GitHub MoonshotAI.",
    sources: [hf("moonshot-hf", "moonshotai"), gh("kimi-cli", "MoonshotAI/kimi-cli", { label: "Kimi CLI" }), ghNew("moonshot-gh", "MoonshotAI")],
  },
  {
    slug: "zai", name: "Z.ai GLM", tagline: "GLM · Zhipu AI", website: "https://z.ai",
    domains: ["z.ai", "zhipuai.cn", "bigmodel.cn", "github.com/zai-org", "huggingface.co/zai-org"], color: "#3b82f6", logo: "zai",
    coverage: "partial", coverageNote: "Tanpa RSS resmi; Hugging Face zai-org + GitHub zai-org.",
    sources: [hf("zai-hf", "zai-org"), ghNew("zai-gh", "zai-org")],
  },
  {
    slug: "meta", name: "Meta AI", tagline: "Llama · FAIR · Meta AI", website: "https://ai.meta.com",
    domains: ["ai.meta.com", "about.fb.com", "engineering.fb.com", "llama.com", "github.com/meta-llama", "github.com/facebookresearch", "huggingface.co/facebook", "huggingface.co/meta-llama"],
    color: "#0866ff", logo: "meta",
    coverage: "mirror", coverageNote: "Mirror komunitas ai.meta.com/blog + RSS resmi Engineering at Meta + Hugging Face meta-llama & facebook.",
    sources: [
      mirror("meta-ai-blog", "Meta AI Blog", "feed_meta_ai.xml"),
      rss("meta-eng", "Engineering at Meta", "https://engineering.fb.com/feed/", { include: "(\\bai\\b|llama|model|ml|machine learning|inference|gpu|agent)" }),
      hf("meta-llama-hf", "meta-llama"),
      hf("facebook-hf", "facebook", 10),
    ],
  },
  {
    slug: "mistral", name: "Mistral AI", tagline: "Mistral · Le Chat · Vibe", website: "https://mistral.ai",
    domains: ["mistral.ai", "docs.mistral.ai", "github.com/mistralai", "huggingface.co/mistralai"], color: "#fa520f", logo: "mistral",
    coverage: "mirror", coverageNote: "Mirror komunitas mistral.ai/news + Hugging Face & GitHub resmi.",
    sources: [
      mirror("mistral-news", "Mistral News", "feed_mistral.xml"),
      hf("mistral-hf", "mistralai"),
      gh("mistral-vibe", "mistralai/mistral-vibe", { label: "Mistral Vibe" }),
    ],
  },
  {
    slug: "minimax", name: "MiniMax", tagline: "MiniMax M · Hailuo · Speech", website: "https://www.minimax.io",
    domains: ["minimax.io", "minimaxi.com", "hailuoai.video", "github.com/MiniMax-AI", "huggingface.co/MiniMaxAI"], color: "#f23f5d", logo: "minimax",
    coverage: "partial", coverageNote: "Tanpa RSS resmi; Hugging Face MiniMaxAI + GitHub MiniMax-AI.",
    sources: [hf("minimax-hf", "MiniMaxAI"), ghNew("minimax-gh", "MiniMax-AI")],
  },
  {
    slug: "cohere", name: "Cohere", tagline: "Command · Embed · Aya", website: "https://cohere.com",
    domains: ["cohere.com", "docs.cohere.com", "github.com/cohere-ai", "huggingface.co/CohereLabs"], color: "#39594d", logo: "cohere",
    coverage: "mirror", coverageNote: "Mirror komunitas cohere.com/blog + Hugging Face CohereLabs + GitHub.",
    sources: [
      mirror("cohere-blog", "Cohere Blog", "feed_cohere.xml"),
      hf("cohere-hf", "CohereLabs"),
      gh("cohere-sdk", "cohere-ai/cohere-python", { limit: 3, label: "Cohere SDK (Python)" }),
    ],
  },
  {
    slug: "microsoft", name: "Microsoft", tagline: "Copilot · Azure AI Foundry · Phi", website: "https://www.microsoft.com/ai",
    domains: ["microsoft.com", "azure.microsoft.com", "blogs.microsoft.com", "news.microsoft.com", "github.com/microsoft", "huggingface.co/microsoft"],
    color: "#00a4ef", logo: "microsoft",
    coverage: "full", coverageNote: "RSS resmi Microsoft Research & Azure Blog + GitHub + Hugging Face.",
    sources: [
      rss("msr-blog", "Microsoft Research Blog", "https://www.microsoft.com/en-us/research/feed/"),
      rss("azure-blog", "Azure Blog", "https://azure.microsoft.com/en-us/blog/feed/", { include: "(\\bai\\b|foundry|copilot|openai|agent|model|llm)" }),
      gh("ms-agent-framework", "microsoft/agent-framework", { limit: 4, label: "Microsoft Agent Framework" }),
      hf("microsoft-hf", "microsoft", 15),
    ],
  },
  {
    slug: "amazon", name: "Amazon", tagline: "AWS Bedrock · Nova · Kiro", website: "https://aws.amazon.com/ai",
    domains: ["aws.amazon.com", "amazon.science", "aboutamazon.com", "github.com/strands-agents", "github.com/awslabs", "huggingface.co/amazon"],
    color: "#ff9900", logo: "amazon",
    coverage: "full", coverageNote: "RSS resmi AWS What's New (filter AI) & AWS ML Blog + GitHub + Hugging Face.",
    sources: [
      rss("aws-whats-new", "AWS What's New", "https://aws.amazon.com/about-aws/whats-new/recent/feed/", { include: "(bedrock|sagemaker|amazon q\\b|nova|kiro|agentcore|generative ai|\\bllm)", limit: 40 }),
      rss("aws-ml-blog", "AWS Machine Learning Blog", "https://aws.amazon.com/blogs/machine-learning/feed/", { include: "(bedrock|nova|agentcore|kiro|amazon q\\b|launch|introduc|announc)" }),
      gh("strands-agents", "strands-agents/sdk-python", { limit: 3, label: "Strands Agents SDK" }),
      hf("amazon-hf", "amazon", 5),
    ],
  },
  {
    slug: "baidu", name: "Baidu", tagline: "ERNIE · PaddlePaddle", website: "https://yiyan.baidu.com",
    domains: ["baidu.com", "github.com/PaddlePaddle", "huggingface.co/baidu"], color: "#2932e1", logo: "baidu",
    coverage: "partial", coverageNote: "Tanpa RSS resmi berbahasa Inggris; Hugging Face baidu + GitHub PaddlePaddle.",
    sources: [hf("baidu-hf", "baidu"), gh("paddleocr", "PaddlePaddle/PaddleOCR", { limit: 3, label: "PaddleOCR" }), gh("ernie", "PaddlePaddle/ERNIE", { limit: 3, label: "ERNIE" })],
  },
  {
    slug: "tencent", name: "Tencent", tagline: "Hunyuan · Yuanbao", website: "https://hunyuan.tencent.com",
    domains: ["tencent.com", "hunyuan.tencent.com", "github.com/Tencent-Hunyuan", "github.com/Tencent", "huggingface.co/tencent"], color: "#0052d9", logo: "tencent",
    coverage: "partial", coverageNote: "Tanpa RSS resmi; Hugging Face tencent + GitHub Tencent-Hunyuan.",
    sources: [hf("tencent-hf", "tencent", 10), ghNew("hunyuan-gh", "Tencent-Hunyuan")],
  },
  {
    slug: "bytedance", name: "ByteDance Seed", tagline: "Doubao · Seed · UI-TARS", website: "https://seed.bytedance.com",
    domains: ["bytedance.com", "seed.bytedance.com", "volcengine.com", "github.com/bytedance", "github.com/ByteDance-Seed", "huggingface.co/ByteDance-Seed", "huggingface.co/ByteDance"],
    color: "#325ab4", logo: "bytedance",
    coverage: "partial", coverageNote: "Tanpa RSS resmi; Hugging Face ByteDance-Seed + GitHub bytedance.",
    sources: [
      hf("bytedance-seed-hf", "ByteDance-Seed"),
      hf("bytedance-hf", "ByteDance", 5),
      gh("ui-tars", "bytedance/UI-TARS-desktop", { limit: 3, label: "UI-TARS Desktop" }),
      gh("deer-flow", "bytedance/deer-flow", { limit: 3, label: "DeerFlow" }),
      ghNew("bytedance-seed-gh", "ByteDance-Seed"),
    ],
  },
  {
    slug: "nvidia", name: "NVIDIA", tagline: "Nemotron · NIM · TensorRT", website: "https://www.nvidia.com/en-us/ai/",
    domains: ["nvidia.com", "blogs.nvidia.com", "developer.nvidia.com", "build.nvidia.com", "github.com/NVIDIA", "huggingface.co/nvidia"], color: "#76b900", logo: "nvidia",
    coverage: "full", coverageNote: "RSS resmi NVIDIA Blog & Developer Blog (filter AI) + GitHub + Hugging Face.",
    sources: [
      rss("nvidia-blog", "NVIDIA Blog", "https://blogs.nvidia.com/feed/", { include: "(\\bai\\b|model|nemotron|nim|agent|llm|inference|blackwell|rubin|cuda)", exclude: "(geforce now|gfn thursday|game)" }),
      rss("nvidia-dev-blog", "NVIDIA Technical Blog", "https://developer.nvidia.com/blog/feed", { include: "(nemotron|nim|\\bllm|agent|model|inference|tensorrt|dynamo)", limit: 30 }),
      gh("tensorrt-llm", "NVIDIA/TensorRT-LLM", { limit: 3, label: "TensorRT-LLM" }),
      hf("nvidia-hf", "nvidia", 25),
    ],
  },
  {
    slug: "ai21", name: "AI21 Labs", tagline: "Jamba · Maestro", website: "https://www.ai21.com",
    domains: ["ai21.com", "docs.ai21.com", "github.com/AI21Labs", "huggingface.co/ai21labs"], color: "#e91e63", logo: "ai21",
    coverage: "partial", coverageNote: "Tanpa RSS resmi; Hugging Face ai21labs + GitHub AI21Labs.",
    sources: [hf("ai21-hf", "ai21labs"), gh("ai21-sdk", "AI21Labs/ai21-python", { limit: 3, label: "AI21 SDK (Python)" })],
  },
  {
    slug: "ibm", name: "IBM", tagline: "Granite · watsonx · Docling", website: "https://www.ibm.com/granite",
    domains: ["ibm.com", "research.ibm.com", "github.com/ibm-granite", "github.com/docling-project", "huggingface.co/ibm-granite"], color: "#0f62fe", logo: "ibm",
    coverage: "full", coverageNote: "RSS resmi IBM Research + Hugging Face ibm-granite + GitHub.",
    sources: [
      rss("ibm-research", "IBM Research Blog", "https://research.ibm.com/rss"),
      hf("ibm-granite-hf", "ibm-granite"),
      gh("docling", "docling-project/docling", { limit: 3, label: "Docling" }),
    ],
  },
];

export const LAB_BY_SLUG: Record<string, LabConfig> = Object.fromEntries(LABS.map((l) => [l.slug, l]));

export function getLab(slug: string): LabConfig | undefined {
  return LAB_BY_SLUG[slug];
}
