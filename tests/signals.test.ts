import { describe, expect, it } from "vitest";
import { LABS } from "../src/config/labs";
import type { DiscoverItem, PressItem, SourceConfig, UpdateItem } from "../src/lib/types";
import { discoverHash, discoverSummaryProblem } from "../src/lib/summaries";
import { buildItem } from "../scripts/collector/merge";
import { CONFIRM_RUNS, trackPrice } from "../scripts/collector/models";
import { labFromText } from "../scripts/collector/signals";
import { clusterStories, entitiesLink, extractEntities, findUnconfirmed, mergePress, splitHeadline, trendingEntities } from "../scripts/collector/stories";

const NOW = Date.parse("2026-10-16T12:00:00Z");
const NOW_ISO = new Date(NOW).toISOString();
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const rss: SourceConfig = { id: "r", type: "rss", name: "RSS", target: "x", trust: "official" };

function official(labSlug: string, title: string, daysAgo: number, excerpt = ""): UpdateItem {
  const lab = LABS.find((l) => l.slug === labSlug)!;
  return buildItem(lab, rss, { title, url: `https://${lab.domains[0]}/${encodeURIComponent(title)}`, publishedAt: new Date(NOW - daysAgo * DAY), excerpt }, iso(0));
}

function press(lab: string, title: string, daysAgo: number, outlets: string[], url = `https://news.example/${encodeURIComponent(title)}`): PressItem {
  return { id: url, lab, title, url, outlet: outlets[0], publishedAt: iso(daysAgo), firstSeenAt: iso(0), reports: outlets.length, outlets, members: [url] };
}

describe("entity extraction", () => {
  it("extracts model names with versions and variants", () => {
    expect(extractEntities("Claude Haiku 5.5 is now on Amazon Bedrock").map((e) => e.label)).toEqual(["Claude Haiku 5.5"]);
    expect(extractEntities("GPT-6.1 Sol Ultrafast mode")[0].key).toBe("gpt 6.1 sol");
    expect(extractEntities("Introducing Gemini 4 Argon for developers")[0].label).toBe("Gemini 4 Argon");
    expect(extractEntities("Qwen3.8-27B open weights")[0].key).toBe("qwen 3.8 27b");
    expect(extractEntities("DeepSeek-V4.1-Flash arrives")[0].label).toBe("DeepSeek 4.1 Flash");
  });

  it("normalizes Claude tiers and ignores non-model text", () => {
    expect(extractEntities("Sonnet 5.5 is 30% cheaper")[0].key).toBe("claude sonnet 5.5");
    expect(extractEntities("Seed round raises 3 million")).toEqual([]);
    expect(extractEntities("GPT-6 family guide for startups")[0].key).toBe("gpt 6");
  });

  it("links an entity with its more specific variant only", () => {
    expect(entitiesLink("gpt 6.1", "gpt 6.1 sol")).toBe(true);
    expect(entitiesLink("gpt 6", "gpt 6.1 sol")).toBe(false);
    expect(entitiesLink("claude haiku 5.5", "claude sonnet 5.5")).toBe(false);
  });
});

describe("press normalization & merging", () => {
  it("splits outlet from Google News headlines", () => {
    expect(splitHeadline("DeepSeek raises funds - Bloomberg.com", "Bloomberg.com")).toEqual({ title: "DeepSeek raises funds", outlet: "Bloomberg.com" });
    expect(splitHeadline("Something happened - Some Outlet")).toEqual({ title: "Something happened", outlet: "Some Outlet" });
  });

  it("merges the same story from different outlets and never double counts a URL", () => {
    const id = (u: string) => u;
    let a: PressItem[] = [];
    const base = { lab: "mistral", at: new Date(NOW - DAY) };
    a = mergePress(a, { ...base, title: "Mistral launches Large 4 model for Europe", url: "https://a.com/1", outlet: "A" }, id, iso(0), 0.5, 3);
    a = mergePress(a, { ...base, title: "Mistral launches Large 4 model for Europe today", url: "https://b.com/2", outlet: "B" }, id, iso(0), 0.5, 3);
    a = mergePress(a, { ...base, title: "Mistral launches Large 4 model for Europe today", url: "https://b.com/2", outlet: "B" }, id, iso(0), 0.5, 3);
    a = mergePress(a, { ...base, title: "Totally different story about funding rounds", url: "https://c.com/3", outlet: "C" }, id, iso(0), 0.5, 3);
    expect(a).toHaveLength(2);
    expect(a[0].reports).toBe(2);
    expect(a[0].outlets).toEqual(["A", "B"]);
  });
});

describe("story clustering", () => {
  const items = [
    official("anthropic", "Claude Haiku 5.5", 2),
    official("amazon", "Claude Haiku 5.5 is now available on Amazon Bedrock", 2),
    official("openai", "GPT-6.1 Sol launches", 3),
  ];
  const media = [
    press("anthropic", "Anthropic ships Claude Haiku 5.5, its cheapest model", 2, ["Reuters", "The Verge"]),
    // A comparison headline mentions Haiku but must not bridge it to the GPT story.
    press("openai", "GPT-6.1 Sol vs Claude Haiku 5.5: which is cheaper?", 2, ["Blog"]),
  ];

  it("groups by primary entity and does not chain through comparison headlines", () => {
    const stories = clusterStories(items, media, NOW);
    const haiku = stories.find((s) => s.entity === "Claude Haiku 5.5");
    expect(haiku).toBeDefined();
    expect(haiku!.labs.sort()).toEqual(["amazon", "anthropic"]);
    expect(haiku!.official).toBe(2);
    expect(haiku!.outlets).toContain("Reuters");
    expect(stories.find((s) => s.labs.includes("openai") && s.labs.includes("anthropic"))).toBeUndefined();
  });

  it("does not create stories from a single source", () => {
    expect(clusterStories([official("openai", "A lone announcement about something", 1)], [], NOW)).toEqual([]);
  });
});

describe("unconfirmed reports", () => {
  it("flags multi-outlet release reports that no official item confirms", () => {
    const reported = press("qwen", "Alibaba unveils new Qwen smart glasses", 1, ["Reuters", "AIM"]);
    expect(findUnconfirmed([], [reported], NOW).map((u) => u.id)).toEqual([reported.id]);
  });

  it("does not flag when the lab published the same news officially", () => {
    const off = official("qwen", "Introducing Qwen smart glasses for everyday life", 1);
    const reported = press("qwen", "Alibaba unveils new Qwen smart glasses", 1, ["Reuters", "AIM"]);
    expect(findUnconfirmed([off], [reported], NOW)).toEqual([]);
  });

  it("ignores single-outlet reports and explainers", () => {
    expect(findUnconfirmed([], [press("qwen", "Alibaba unveils Qwen glasses", 1, ["One"])], NOW)).toEqual([]);
    expect(findUnconfirmed([], [press("qwen", "What is Qwen? Why Alibaba launches models", 1, ["A", "B"])], NOW)).toEqual([]);
  });
});

describe("trending & lab attribution", () => {
  it("counts entity mentions across official and press for this vs last week", () => {
    const off = [official("xai", "Grok 4.7 arrives", 1), official("amazon", "Grok 4.7 on Bedrock", 2)];
    const med = [press("xai", "Grok 4.7 benchmarks", 3, ["A", "B"])];
    const t = trendingEntities(off, med, NOW);
    expect(t[0]).toMatchObject({ name: "Grok 4.7", count: 3, prev: 0 });
  });

  it("attributes text to labs by alias", () => {
    expect(labFromText("Redesigning source control at Anthropic")).toBe("anthropic");
    expect(labFromText("Gemini 4 Argon for Robotics")).toBe("google-deepmind");
    expect(labFromText("A budgeting app")).toBeUndefined();
  });
});

describe("debounced price tracking", () => {
  const entry = (over: Partial<Parameters<typeof trackPrice>[0] & object> = {}) => ({
    prompt: 1, completion: 2, history: [{ at: "2026-10-01T00:00:00.000Z", prompt: 1, completion: 2 }], firstSeenAt: "2026-10-01T00:00:00.000Z", ...over,
  });

  it("does not report a change on the first sighting", () => {
    const t = trackPrice(undefined, { prompt: 1, completion: 2 }, NOW_ISO);
    expect(t.confirmed).toBeUndefined();
    expect(t.stable).toMatchObject({ prompt: 1, completion: 2 });
  });

  it("ignores prices that flap and return to the stable value", () => {
    const a = trackPrice(entry(), { prompt: 5, completion: 2 }, NOW_ISO);
    expect(a.pending).toMatchObject({ prompt: 5, runs: 1 });
    const b = trackPrice(entry({ stable: a.stable, pending: a.pending, history: a.history }), { prompt: 1, completion: 2 }, NOW_ISO);
    expect(b.pending).toBeUndefined();
    expect(b.confirmed).toBeUndefined();
  });

  it("confirms a change only after it holds for CONFIRM_RUNS snapshots", () => {
    let cur = entry();
    let out = trackPrice(cur, { prompt: 0.5, completion: 2 }, NOW_ISO);
    for (let i = 1; i < CONFIRM_RUNS; i++) {
      expect(out.confirmed).toBeUndefined();
      cur = entry({ stable: out.stable, pending: out.pending, history: out.history });
      out = trackPrice(cur, { prompt: 0.5, completion: 2 }, NOW_ISO);
    }
    expect(out.confirmed).toEqual({ from: { prompt: 1, completion: 2 }, to: { prompt: 0.5, completion: 2 } });
    expect(out.stable.prompt).toBe(0.5);
    expect(out.history.at(-1)).toMatchObject({ prompt: 0.5 });
  });
});

describe("discover summaries go stale when the source changes", () => {
  const item = { id: "d1", name: "Tool", description: "A tool with 43 styles", topics: ["x"], quote: undefined } as unknown as DiscoverItem;
  const entry = { hash: discoverHash(item), summary: "Tool offers 43 styles for creators.", unique: "Styles are coded rather than rendered.", benefit: "Creators can start from coded styles." };

  it("accepts a fresh grounded summary", () => {
    expect(discoverSummaryProblem(entry, item)).toBeNull();
  });

  it("reports stale (not a hallucination) when the description changed after summarizing", () => {
    const changed = { ...item, description: "A tool with 51 styles" } as DiscoverItem;
    expect(discoverSummaryProblem(entry, changed)).toMatch(/^stale/);
  });

  it("still rejects invented numbers when the hash matches", () => {
    expect(discoverSummaryProblem({ ...entry, summary: "Tool offers 99 styles." }, item)).toMatch(/numbers/);
  });
});
