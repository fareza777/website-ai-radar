import { afterEach, describe, expect, it } from "vitest";
import { LABS } from "../src/config/labs";
import { labFromHandle, PRESS } from "../src/config/signals";
import type { PressItem, SocialPost, SourceConfig, UpdateItem } from "../src/lib/types";
import { tipPostUrl } from "../scripts/collector/buzz";
import { HttpError, errorMessage, redact } from "../scripts/collector/http";
import { labFromText } from "../scripts/collector/lab-text";
import { buildItem } from "../scripts/collector/merge";
import { mapXApi, mergeSocial, threadsFromTips, xApiStart } from "../scripts/collector/social";
import { clusterStories, findUnconfirmed, independentOutlets, mergePress, outletKey, trendingEntities } from "../scripts/collector/stories";
import { parseDayUtc, titleTokens } from "../scripts/collector/text";

const NOW = Date.parse("2026-10-16T12:00:00Z");
const NOW_ISO = new Date(NOW).toISOString();
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const rss: SourceConfig = { id: "r", type: "rss", name: "RSS", target: "x", trust: "official" };

function official(labSlug: string, title: string, daysAgo: number): UpdateItem {
  const lab = LABS.find((l) => l.slug === labSlug)!;
  return buildItem(lab, rss, { title, url: `https://${lab.domains[0]}/${encodeURIComponent(title)}`, publishedAt: new Date(NOW - daysAgo * DAY), excerpt: "" }, iso(0));
}

function press(lab: string, title: string, daysAgo: number, outlets: string[], url = `https://news.example/${encodeURIComponent(title)}`): PressItem {
  return { id: `${lab}:${url}`, lab, title, url, outlet: outlets[0], publishedAt: iso(daysAgo), firstSeenAt: iso(0), reports: outlets.length, outlets, members: [url] };
}

describe("secrets never reach logs", () => {
  const token = "THREADS-token-0123456789-abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789".repeat(3);
  const prior = process.env.THREADS_ACCESS_TOKEN;
  afterEach(() => {
    if (prior === undefined) delete process.env.THREADS_ACCESS_TOKEN;
    else process.env.THREADS_ACCESS_TOKEN = prior;
  });

  it("masks a token in the URL of an HTTP error even after the message is truncated", () => {
    process.env.THREADS_ACCESS_TOKEN = token;
    const url = `https://graph.threads.net/v1.0/profile_posts?username=x&fields=id&access_token=${encodeURIComponent(token)}`;
    const message = errorMessage(new HttpError(401, url));
    expect(message).not.toContain(token.slice(0, 20));
    expect(message).toContain("access_token=***");
  });

  it("masks secret query params and literal env values wherever they appear", () => {
    process.env.THREADS_ACCESS_TOKEN = "abcdef1234567890";
    expect(redact("GET /x?a=1&token=SECRETVALUE&b=2")).toBe("GET /x?a=1&token=***&b=2");
    expect(redact("failed with abcdef1234567890 and again abcdef1234567890")).toBe("failed with *** and again ***");
  });
});

describe("tip issues", () => {
  const form = (label: string, url: string) => `### ${label}\n\n${url}\n\n### Product URL\n\nhttps://example.com\n`;

  it("reads the post URL under both the old and the new issue-form label", () => {
    expect(tipPostUrl(form("X post URL", "https://x.com/someone/status/123"))).toBe("https://x.com/someone/status/123");
    expect(tipPostUrl(form("X or Threads post URL", "https://x.com/someone/status/123"))).toBe("https://x.com/someone/status/123");
    expect(tipPostUrl(form("X or Threads post URL", "https://www.threads.com/@someone/post/ABC123"))).toBe("https://www.threads.com/@someone/post/ABC123");
  });

  it("falls back to a post URL anywhere in free text", () => {
    expect(tipPostUrl("check this out https://x.com/a_b/status/99 it is great")).toBe("https://x.com/a_b/status/99");
    expect(tipPostUrl("check this https://www.threads.net/@meta.ai/post/C9x-1_ ok")).toBe("https://www.threads.net/@meta.ai/post/C9x-1_");
    expect(tipPostUrl("no post here")).toBeNull();
  });
});

describe("official flag cannot be forged", () => {
  it("never resolves prototype members as a lab handle", () => {
    expect(labFromHandle("constructor")).toBeUndefined();
    expect(labFromHandle("__proto__")).toBeUndefined();
    expect(labFromHandle("toString")).toBeUndefined();
  });

  it("does not attribute link-only Threads tips to a lab, even for an official-looking handle", () => {
    const [p] = threadsFromTips([{ x: "https://www.threads.net/@metaai/post/AAA", addedAt: NOW_ISO }], NOW_ISO);
    expect(p.official).toBe(false);
    expect(p.lab).toBeUndefined();
  });
});

describe("social archive hygiene", () => {
  const base: SocialPost = { id: "x:1", platform: "x", handle: "a", author: "A", text: "t", url: "https://x.com/a/status/1", at: "2026-10-10T00:00:00.000Z", exactTime: false, links: [], via: "newsletter", official: false, firstSeenAt: "2026-10-10T01:00:00.000Z" };

  it("keeps the known time when the same post is sighted again with a day-only date", () => {
    const again: SocialPost = { ...base, at: "2026-10-16T11:00:00.000Z", firstSeenAt: NOW_ISO };
    const [m] = mergeSocial([base], [again], new Date(NOW), 30, 10);
    expect(m.at).toBe(base.at);
  });

  it("downgrades old oEmbed records to inexact and strips lab/official from link-only Threads tips", () => {
    const oembed: SocialPost = { ...base, id: "x:2", exactTime: true, at: "2026-10-14T17:00:00.000Z" };
    const threads: SocialPost = { ...base, id: "threads:A", platform: "threads", via: "tip", lab: "meta", official: true, at: "2026-10-14T00:00:00.000Z" };
    const out = mergeSocial([oembed, threads], [], new Date(NOW), 30, 10);
    expect(out.find((p) => p.id === "x:2")?.exactTime).toBe(false);
    const th = out.find((p) => p.id === "threads:A")!;
    expect(th.official).toBe(false);
    expect(th.lab).toBeUndefined();
  });

  it("does not interpret $-patterns in expanded URLs and decodes HTML entities in tweet text", () => {
    const out = mapXApi(
      {
        data: [{ id: "5", text: "Tom &amp; Jerry https://t.co/zz", author_id: "u", entities: { urls: [{ url: "https://t.co/zz", expanded_url: "https://example.com/a?x=$&y=1" }] } }],
        includes: { users: [{ id: "u", username: "someone" }] },
      },
      NOW_ISO,
    );
    expect(out[0].text).toBe("Tom & Jerry https://example.com/a?x=$&y=1");
  });

  it("asks the X API only for what is new since the last success (never beyond 7 days)", () => {
    expect(xApiStart(new Date(NOW), null)).toBe(new Date(NOW - 7 * DAY + 60_000).toISOString());
    const last = new Date(NOW - 3 * 3_600_000).toISOString();
    expect(Date.parse(xApiStart(new Date(NOW), last))).toBe(NOW - 3 * 3_600_000 - 30 * 60_000);
    expect(xApiStart(new Date(NOW), new Date(NOW - 30 * DAY).toISOString())).toBe(new Date(NOW - 7 * DAY + 60_000).toISOString());
  });
});

describe("day-only dates", () => {
  it("parses an oEmbed day label as UTC midnight regardless of the runner's timezone", () => {
    expect(parseDayUtc("October 14, 2026")?.toISOString()).toBe("2026-10-14T00:00:00.000Z");
    expect(parseDayUtc("Oct. 3, 2026")?.toISOString()).toBe("2026-10-03T00:00:00.000Z");
    expect(parseDayUtc("yesterday")).toBeNull();
    expect(parseDayUtc(undefined)).toBeNull();
  });
});

describe("press identity and multi-lab stories", () => {
  it("scopes ids by lab so one article matched by two labs' queries never shares a key", () => {
    const id = (u: string) => u;
    const raw = { title: "DeepSeek backs ex-Tencent AI scientist robot lab", url: "https://n.example/a", outlet: "Bloomberg", at: new Date(NOW - DAY) };
    const a = mergePress(mergePress([], { ...raw, lab: "deepseek" }, id, NOW_ISO, 0.5, 3), { ...raw, lab: "tencent" }, id, NOW_ISO, 0.5, 3);
    expect(a.map((p) => p.id)).toEqual(["deepseek:https://n.example/a", "tencent:https://n.example/a"]);
  });

  it("does not turn a single article filed under two labs into a multi-lab story", () => {
    const one = [
      press("deepseek", "DeepSeek backs ex-Tencent AI scientist robot lab", 1, ["Bloomberg"], "https://n.example/same"),
      press("tencent", "DeepSeek backs ex-Tencent AI scientist robot lab", 1, ["Bloomberg"], "https://n.example/same"),
    ];
    expect(clusterStories([], one, NOW)).toEqual([]);
  });

  it("counts only independent media as press coverage of a story", () => {
    const stories = clusterStories(
      [official("anthropic", "Claude Haiku 5.5", 2), official("amazon", "Claude Haiku 5.5 is now available on Amazon Bedrock", 2)],
      [press("amazon", "Claude Haiku 5.5 now on Bedrock", 2, ["Amazon Web Services (AWS)"])],
      NOW,
    );
    expect(stories).toHaveLength(1);
    expect(stories[0]).toMatchObject({ official: 2, press: 0, outlets: [] });
  });

  it("never merges reports about different versions of the same model family", () => {
    const id = (u: string) => u;
    const at = new Date(NOW - DAY);
    let a: PressItem[] = [];
    a = mergePress(a, { lab: "anthropic", title: "Anthropic launches Claude Opus 5 model", url: "https://a.com/1", outlet: "A", at }, id, NOW_ISO, 0.5, 3);
    a = mergePress(a, { lab: "anthropic", title: "Anthropic launches Claude Opus 6 model", url: "https://b.com/2", outlet: "B", at }, id, NOW_ISO, 0.5, 3);
    expect(a).toHaveLength(2);
  });

  it("keeps single digits so versions stay distinguishable", () => {
    expect(titleTokens("Claude Opus 5")).not.toEqual(titleTokens("Claude Opus 6"));
    expect(titleTokens("Claude Opus 5").has("5")).toBe(true);
  });
});

describe("outlets", () => {
  it("normalizes spelling variants and drops the labs' own publications", () => {
    expect(outletKey("https://tech-insider.org/")).toBe(outletKey("tech-insider.org"));
    expect(outletKey("www.marketscreener.com")).toBe("marketscreener.com");
    expect(independentOutlets(["marketscreener.com", "www.marketscreener.com", "NVIDIA Developer", "Reuters"], ["nvidia"])).toEqual(["marketscreener.com", "Reuters"]);
    expect(independentOutlets(["blog.google", "Amazon Web Services (AWS)", "The Verge"], ["google-deepmind", "amazon"])).toEqual(["The Verge"]);
  });

  it("does not count one outlet spelled twice as independent confirmation", () => {
    const dup = press("qwen", "Alibaba unveils new Qwen smart glasses", 1, ["marketscreener.com", "www.marketscreener.com"]);
    expect(findUnconfirmed([], [dup], NOW)).toEqual([]);
  });
});

describe("unconfirmed reports stay about the lab and about releases", () => {
  it("rejects a headline whose subject is another lab", () => {
    const wrongLab = press("openai", "Google launches Gemini 5 as OpenAI scrambles to respond", 1, ["Reuters", "The Verge"]);
    expect(findUnconfirmed([], [wrongLab], NOW)).toEqual([]);
  });

  it("rejects partnerships, hiring and plans that are not releases", () => {
    for (const title of [
      "Anthropic partners with Deloitte to roll out Claude to staff",
      "OpenAI launches global hiring drive for its research team",
      "Anthropic to launch Claude 6 next month, sources say",
      "Mistral raises new funding round and launches expansion plans",
    ]) {
      const lab = title.startsWith("Mistral") ? "mistral" : title.startsWith("OpenAI") ? "openai" : "anthropic";
      expect(findUnconfirmed([], [press(lab, title, 1, ["Reuters", "The Verge"])], NOW), title).toEqual([]);
    }
  });

  it("still flags a genuine multi-outlet release report", () => {
    const real = press("mistral", "Mistral launches Large 4 model for Europe", 1, ["Reuters", "The Verge"]);
    expect(findUnconfirmed([], [real], NOW).map((u) => u.id)).toEqual([real.id]);
  });
});

describe("lab attribution by alias", () => {
  it("matches whole words only", () => {
    expect(labFromText("Veolia signs a new water contract")).toBeUndefined();
    expect(labFromText("Sorare launches a fantasy football season")).toBeUndefined();
    expect(labFromText("Claudette Colvin documentary")).toBeUndefined();
    expect(labFromText("Claude Code gets plugins")).toBe("anthropic");
  });

  it("picks the lab named first in the headline", () => {
    expect(labFromText("Anthropic's Claude beats GPT-5 on coding")).toBe("anthropic");
    expect(labFromText("GPT-6 outperforms Claude on reasoning")).toBe("openai");
  });
});

describe("trending names", () => {
  it("attributes labs from their own posts, not from press that merely mentions the name", () => {
    const off = [official("openai", "GPT-6 arrives", 1), official("openai", "GPT-6 in the API", 2)];
    const med = [press("deepseek", "GPT-6 shakes up DeepSeek plans", 1, ["A", "B"]), press("zai", "Why GPT-6 matters for Zhipu", 2, ["A", "B"])];
    const t = trendingEntities(off, med, NOW);
    expect(t[0]).toMatchObject({ name: "GPT 6", count: 4 });
    expect(t[0].labs).toEqual(["openai"]);
  });
});

describe("press noise filter", () => {
  const exclude = new RegExp(PRESS.exclude, "i");
  it("drops finance chatter but keeps news that merely uses the word 'shares'", () => {
    expect(exclude.test("Nvidia stock falls after earnings")).toBe(true);
    expect(exclude.test("Nvidia shares jump 5% on AI demand")).toBe(true);
    expect(exclude.test("Buy shares of Microsoft before the rally")).toBe(true);
    expect(exclude.test("Nvidia shares new Nemotron model with developers")).toBe(false);
    expect(exclude.test("IBM shares Granite 4 weights on Hugging Face")).toBe(false);
  });
});
