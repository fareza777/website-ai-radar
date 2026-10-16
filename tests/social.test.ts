import { describe, expect, it } from "vitest";
import { labFromHandle } from "../src/config/signals";
import type { SocialPost } from "../src/lib/types";
import { mapThreads, mapXApi, mergeSocial, postsFromBuzz, threadsFromTips, xQueryChunks } from "../scripts/collector/social";

const NOW = new Date("2026-10-16T12:00:00Z");
const NOW_ISO = NOW.toISOString();

describe("handle attribution", () => {
  it("maps official handles to labs case-insensitively", () => {
    expect(labFromHandle("AnthropicAI")).toBe("anthropic");
    expect(labFromHandle("@openaidevs")).toBe("openai");
    expect(labFromHandle("someone_random")).toBeUndefined();
  });
});

describe("X posts read via oEmbed (newsletters & tips)", () => {
  const quote = { text: "Claude Haiku 5.5 is here.", author: "Claude", handle: "claudeai", url: "https://x.com/claudeai/status/2107522596845822135", date: "2026-10-07T10:00:00.000Z" };

  it("turns posts into social items and attributes official accounts to the lab", () => {
    const [p] = postsFromBuzz([{ quote, links: ["https://www.anthropic.com/claude-haiku-5-5", "https://x.com/claudeai/status/1"], via: "newsletter" }], NOW_ISO);
    // oEmbed exposes only the calendar day, so the time is never claimed as exact.
    expect(p).toMatchObject({ id: "x:2107522596845822135", platform: "x", lab: "anthropic", official: true, exactTime: false, via: "newsletter" });
    expect(p.links).toEqual(["https://www.anthropic.com/claude-haiku-5-5"]);
  });

  it("marks third-party posts as unofficial and tip-sourced posts as tips", () => {
    const [p] = postsFromBuzz([{ quote: { ...quote, handle: "founder_x", url: "https://x.com/founder_x/status/9" }, links: [], via: "tip" }], NOW_ISO);
    expect(p.official).toBe(false);
    expect(p.lab).toBeUndefined();
    expect(p.via).toBe("tip");
  });

  it("falls back to first-seen time when the post date is unknown", () => {
    const [p] = postsFromBuzz([{ quote: { ...quote, date: null }, links: [], via: "newsletter" }], NOW_ISO);
    expect(p).toMatchObject({ at: NOW_ISO, exactTime: false });
  });
});

describe("Threads", () => {
  it("keeps tipped Threads URLs as link-only items", () => {
    const [p] = threadsFromTips([{ x: "https://www.threads.net/@metaai/post/C9abc_DEF?xmt=1", addedAt: "2026-10-15T08:00:00.000Z" }], NOW_ISO);
    // Nothing was fetched, so the handle in the URL is unverified: no lab, never official.
    expect(p).toMatchObject({ id: "threads:C9abc_DEF", platform: "threads", handle: "metaai", text: "", exactTime: false, official: false });
    expect(p.lab).toBeUndefined();
    expect(p.url).toBe("https://www.threads.net/@metaai/post/C9abc_DEF");
    expect(threadsFromTips([{ x: "https://x.com/a/status/1", addedAt: NOW_ISO }], NOW_ISO)).toEqual([]);
  });

  it("maps Threads API rows and applies the like threshold to community posts only", () => {
    const rows = [
      { permalink: "https://www.threads.com/@metaai/post/AAA", text: "New Llama update", timestamp: "2026-10-16T09:00:00+0000", username: "metaai", like_count: 3 },
      { permalink: "https://www.threads.com/@rando/post/BBB", text: "hot take on LLMs", timestamp: "2026-10-16T09:00:00+0000", username: "rando", like_count: 500 },
      { permalink: "https://www.threads.com/@rando/post/CCC", text: "meh", timestamp: "2026-10-16T09:00:00+0000", username: "rando", like_count: 2 },
      { permalink: "not a url", text: "bad", username: "x" },
    ];
    const out = mapThreads(rows, NOW_ISO, 40);
    expect(out.map((p) => p.id)).toEqual(["threads:AAA", "threads:BBB"]);
    expect(out[0]).toMatchObject({ official: true, lab: "meta", via: "threads-api" });
    expect(out[1].official).toBe(false);
  });
});

describe("X API v2 recent search", () => {
  const body = {
    data: [
      {
        id: "111",
        text: "Introducing Opus 5.5 https://t.co/abc",
        created_at: "2026-10-16T08:30:00.000Z",
        author_id: "u1",
        public_metrics: { like_count: 1200, retweet_count: 300, reply_count: 40, quote_count: 5 },
        entities: { urls: [{ url: "https://t.co/abc", expanded_url: "https://www.anthropic.com/news/opus-5-5" }] },
      },
      { id: "222", text: "orphan", author_id: "missing" },
    ],
    includes: { users: [{ id: "u1", username: "AnthropicAI", name: "Anthropic" }] },
  };

  it("maps tweets, expands t.co links and attributes the lab", () => {
    const out = mapXApi(body, NOW_ISO);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "x:111", lab: "anthropic", likes: 1200, reposts: 300, via: "x-api", official: true, exactTime: true });
    expect(out[0].text).toBe("Introducing Opus 5.5 https://www.anthropic.com/news/opus-5-5");
    expect(out[0].links).toEqual(["https://www.anthropic.com/news/opus-5-5"]);
    expect(out[0].url).toBe("https://x.com/AnthropicAI/status/111");
  });

  it("builds queries under the 512-character limit", () => {
    const handles = Array.from({ length: 60 }, (_, i) => `handle_number_${i}`);
    const chunks = xQueryChunks(handles);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(512);
      expect(c.endsWith("-is:retweet -is:reply")).toBe(true);
    }
    expect(chunks.join(" ").match(/from:/g)).toHaveLength(60);
  });
});

describe("merging the social archive", () => {
  const base: SocialPost = { id: "x:1", platform: "x", handle: "a", author: "A", text: "from newsletter", url: "https://x.com/a/status/1", at: "2026-10-10T00:00:00.000Z", exactTime: false, links: [], via: "newsletter", official: false, firstSeenAt: "2026-10-10T01:00:00.000Z" };

  it("lets API data enrich an earlier sighting without losing first-seen time", () => {
    const api: SocialPost = { ...base, text: "from newsletter", at: "2026-10-09T12:00:00.000Z", exactTime: true, likes: 99, via: "x-api", firstSeenAt: NOW_ISO };
    const [m] = mergeSocial([base], [api], NOW, 30, 100);
    expect(m).toMatchObject({ likes: 99, via: "x-api", exactTime: true, at: "2026-10-09T12:00:00.000Z", firstSeenAt: "2026-10-10T01:00:00.000Z" });
  });

  it("keeps existing text when an incoming link-only record is empty and drops expired posts", () => {
    const linkOnly: SocialPost = { ...base, text: "", via: "tip" };
    const old: SocialPost = { ...base, id: "x:2", at: "2026-08-01T00:00:00.000Z" };
    const out = mergeSocial([base, old], [linkOnly], NOW, 30, 100);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe("from newsletter");
  });
});
