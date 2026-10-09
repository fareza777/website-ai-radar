import { describe, expect, it } from "vitest";
import { LABS } from "../src/config/labs";
import type { SourceConfig, UpdateItem } from "../src/lib/types";
import { classify, importance, isPrerelease, semverKind } from "../scripts/collector/classify";
import { parseFeed } from "../scripts/collector/feed";
import { buildItem, dedupe, mergeItems } from "../scripts/collector/merge";
import { isOfficialUrl, jaccard, normalizeUrl, parseDate, stripHtml, titleTokens, truncate } from "../scripts/collector/text";

const openai = LABS.find((l) => l.slug === "openai")!;
const rssSource: SourceConfig = { id: "openai-news", type: "rss", name: "OpenAI News", target: "x", trust: "official" };
const NOW = "2026-10-09T00:00:00.000Z";

describe("text utils", () => {
  it("normalizes URLs for identity", () => {
    expect(normalizeUrl("http://www.openai.com/index/foo/?utm_source=x&a=1#top")).toBe("https://openai.com/index/foo?a=1");
    expect(normalizeUrl("https://openai.com/")).toBe("https://openai.com/");
  });

  it("strips HTML and decodes entities, including double-encoded markup", () => {
    expect(stripHtml("<p>Hello&nbsp;<b>world</b> &amp; more</p>")).toBe("Hello world & more");
    expect(stripHtml("&lt;p&gt;Encoded&lt;/p&gt;")).toBe("Encoded");
  });

  it("never invents dates", () => {
    expect(parseDate("")).toBeNull();
    expect(parseDate("not a date")).toBeNull();
    expect(parseDate("Wed, 08 Oct 2026 10:00:00 GMT")?.toISOString()).toBe("2026-10-08T10:00:00.000Z");
    expect(parseDate(1760000000)?.getUTCFullYear()).toBe(2025);
  });

  it("truncates on word boundaries", () => {
    expect(truncate("one two three four five", 12)).toBe("one two…");
  });

  it("verifies official domains including org paths", () => {
    expect(isOfficialUrl("https://www.anthropic.com/news/x", ["anthropic.com"])).toBe(true);
    expect(isOfficialUrl("https://docs.anthropic.com/x", ["anthropic.com"])).toBe(true);
    expect(isOfficialUrl("https://evil-anthropic.com/x", ["anthropic.com"])).toBe(false);
    expect(isOfficialUrl("https://github.com/openai/codex/releases", ["github.com/openai"])).toBe(true);
    expect(isOfficialUrl("https://github.com/openai-fake/codex", ["github.com/openai"])).toBe(false);
  });

  it("measures title similarity", () => {
    expect(jaccard(titleTokens("Introducing GPT-6 Luna"), titleTokens("GPT-6 Luna is here"))).toBeGreaterThan(0.5);
    expect(jaccard(titleTokens("Claude Code 2.1"), titleTokens("Sora app update"))).toBe(0);
  });
});

describe("feed parser", () => {
  it("parses RSS 2.0", () => {
    const xml = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[Hello & bye]]></title><link>https://a.com/1</link><pubDate>Wed, 08 Oct 2026 10:00:00 GMT</pubDate><description>&lt;p&gt;Body&lt;/p&gt;</description></item></channel></rss>`;
    const [e] = parseFeed(xml);
    expect(e.title).toBe("Hello & bye");
    expect(e.url).toBe("https://a.com/1");
    expect(e.publishedAt?.toISOString()).toBe("2026-10-08T10:00:00.000Z");
    expect(stripHtml(e.html)).toBe("Body");
  });

  it("parses Atom with alternate links", () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>v1.2.0</title><link rel="alternate" href="https://github.com/o/r/releases/tag/v1.2.0"/><updated>2026-10-01T00:00:00Z</updated><content type="html">&lt;p&gt;Notes&lt;/p&gt;</content></entry></feed>`;
    const [e] = parseFeed(xml);
    expect(e.url).toBe("https://github.com/o/r/releases/tag/v1.2.0");
    expect(e.publishedAt?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("rejects unknown formats", () => {
    expect(() => parseFeed("<html><body>nope</body></html>")).toThrow();
  });
});

describe("classification & ranking", () => {
  it("classifies by source type and keywords", () => {
    expect(classify("Qwen3.7-Plus", "", "huggingface")).toBe("model");
    expect(classify("Claude Code v2.1.0", "", "github-releases")).toBe("developer");
    expect(classify("Introducing GPT-6 Luna", "Our most capable model", "rss")).toBe("model");
    expect(classify("New lower pricing for the API", "", "rss")).toBe("pricing");
    expect(classify("Get $100 in free credits", "", "rss")).toBe("promo");
    expect(classify("Responses API now supports webhooks", "", "rss")).toBe("api");
    expect(classify("A new paper on interpretability research", "", "rss")).toBe("research");
  });

  it("does not label promo from a passing body mention", () => {
    expect(classify("Our approach to safety research", "includes free credits for researchers", "rss")).not.toBe("promo");
  });

  it("detects semver kinds and prereleases", () => {
    expect(semverKind("v2.0.0")).toBe("major");
    expect(semverKind("1.4.0")).toBe("minor");
    expect(semverKind("rust-v0.46.3")).toBe("patch");
    expect(isPrerelease("v1.0.0-beta.2")).toBe(true);
    expect(isPrerelease("v1.0.0")).toBe(false);
  });

  it("ranks flagship launches above patch releases", () => {
    const launch = importance({ lab: "openai", title: "Introducing GPT-6", category: "model", sourceType: "rss", verified: true });
    const patch = importance({ lab: "openai", title: "Codex CLI v0.46.3", category: "developer", sourceType: "github-releases", verified: true, meta: { semver: "patch" } });
    expect(launch).toBeGreaterThanOrEqual(75);
    expect(patch).toBeLessThan(40);
    expect(launch).toBeLessThanOrEqual(100);
  });
});

function raw(title: string, url: string, date = "2026-10-08T10:00:00Z", excerpt = "") {
  return { title, url, publishedAt: new Date(date), excerpt };
}

describe("merge & dedupe", () => {
  it("builds verified items with Indonesian template summaries", () => {
    const item = buildItem(openai, rssSource, raw("Introducing GPT-6", "https://openai.com/index/gpt-6/?utm_source=rss"), NOW);
    expect(item.url).toBe("https://openai.com/index/gpt-6");
    expect(item.verified).toBe(true);
    expect(item.summary).toContain("OpenAI");
    expect(item.summarySource).toBe("template");
  });

  it("keeps history, preserves firstSeenAt and flags content changes", () => {
    const v1 = buildItem(openai, rssSource, raw("Post", "https://openai.com/p", undefined, "old"), "2026-10-01T00:00:00.000Z");
    const other = buildItem(openai, rssSource, raw("Older post", "https://openai.com/o"), "2026-10-01T00:00:00.000Z");
    const v2 = buildItem(openai, rssSource, raw("Post", "https://openai.com/p", undefined, "new body"), NOW);
    const merged = mergeItems([v1, other], [v2], NOW);
    expect(merged).toHaveLength(2); // `other` kept even though the source no longer lists it
    const p = merged.find((i) => i.id === v1.id)!;
    expect(p.firstSeenAt).toBe("2026-10-01T00:00:00.000Z");
    expect(p.updatedAt).toBe(NOW);
    expect(p.excerpt).toBe("new body");
  });

  it("keeps LLM summaries when content is unchanged", () => {
    const base = buildItem(openai, rssSource, raw("Post", "https://openai.com/p"), NOW);
    const llm: UpdateItem = { ...base, summary: "Ringkasan LLM", summarySource: "llm" };
    const [merged] = mergeItems([llm], [base], NOW);
    expect(merged.summary).toBe("Ringkasan LLM");
  });

  it("collapses the same story from two sources and remembers the absorbed URL", () => {
    const mirrorSrc: SourceConfig = { ...rssSource, id: "mirror", trust: "mirror", name: "Mirror" };
    const official = buildItem(openai, rssSource, raw("Introducing GPT-6 Luna", "https://openai.com/a"), NOW);
    const copy = buildItem(openai, mirrorSrc, raw("Introducing GPT-6 Luna", "https://openai.com/a-copy", "2026-10-09T01:00:00Z"), NOW);
    const out = dedupe([copy, official]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(official.id);
    expect(out[0].seenIn?.[0].url).toBe("https://openai.com/a-copy");
    // Next run: the absorbed item must not reappear.
    expect(mergeItems(out, [copy], NOW)).toHaveLength(1);
  });

  it("does not merge similar titles far apart in time", () => {
    const a = buildItem(openai, rssSource, raw("Weekly update", "https://openai.com/1", "2026-09-01T00:00:00Z"), NOW);
    const b = buildItem(openai, rssSource, raw("Weekly update", "https://openai.com/2", "2026-10-01T00:00:00Z"), NOW);
    expect(dedupe([a, b])).toHaveLength(2);
  });
});

describe("source registry", () => {
  it("has 20 labs with unique slugs and source ids", () => {
    expect(LABS).toHaveLength(20);
    expect(new Set(LABS.map((l) => l.slug)).size).toBe(20);
    const ids = LABS.flatMap((l) => l.sources.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of LABS) expect(l.sources.length).toBeGreaterThan(0);
  });

  it("only uses valid regex filters", () => {
    for (const s of LABS.flatMap((l) => l.sources)) {
      for (const p of [s.include, s.exclude]) if (p) expect(() => new RegExp(p, "i")).not.toThrow();
    }
  });
});

describe("regression: false positives seen in real data", () => {
  it("does not treat 'Frontier' or company names as pricing", () => {
    expect(classify("Into the Omniverse: Developers Turn Ideas Into Simulations With Frontier AI Agents", "", "rss")).not.toBe("pricing");
    expect(classify("T. Rowe Price brings more of Claude to its investment process", "", "rss")).not.toBe("pricing");
    expect(classify("Helping teens learn, plan, and shape the future of AI", "", "rss")).not.toBe("pricing");
  });

  it("does not treat 'research' as the feature keyword 'search'", () => {
    expect(classify("New interpretability research", "", "rss")).toBe("research");
  });

  it("does not treat product names without a version as model releases", () => {
    expect(classify("Claude for Teachers, now available for U.S. schools", "", "rss")).not.toBe("model");
    expect(classify("Introducing Claude Opus 5.5", "", "rss")).toBe("model");
  });

  it("downranks customer stories and listicles", () => {
    const story = importance({ lab: "openai", title: "How Oracle turns days of work into minutes with ChatGPT", category: "feature", sourceType: "rss", verified: true });
    const launch = importance({ lab: "openai", title: "Introducing ChatGPT Pulse", category: "feature", sourceType: "rss", verified: true });
    expect(story).toBeLessThan(launch);
  });

  it("decodes double-encoded entities", () => {
    expect(stripHtml("Bedrock.&amp;nbsp;Ultrafast")).toBe("Bedrock. Ultrafast");
  });
});
