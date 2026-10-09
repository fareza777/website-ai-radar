/**
 * BUZZ RADAR — surfaces startups/tools that are buzzing on X without scraping X.
 *
 * Legal access paths only:
 *  1. Tips: you paste an X post (or product URL) via /submit → GitHub Issue → the collector reads the
 *     post through X's official oEmbed endpoint (publish.twitter.com), follows its links, verifies the
 *     product page, and adds it to Discover.
 *  2. Newsletters that curate AI Twitter (their RSS links to products and to X posts → oEmbed).
 *  3. Optional X API v2 recent search when X_BEARER_TOKEN is set (paid X developer access).
 *  4. Startup news RSS (funding/launch headlines) and Hugging Face trending Spaces.
 */

export const BUZZ = {
  tips: {
    /** GitHub repo whose issues labeled `radar-tip` are read (GITHUB_REPOSITORY overrides in Actions). */
    repo: "fareza777/website-ai-radar",
    label: "radar-tip",
    approvedLabel: "approved",
    /** Issue authors trusted without the approved label. */
    trustedAssociations: ["OWNER", "MEMBER", "COLLABORATOR"],
    keepDays: 120,
  },

  newsletters: [
    { id: "bensbites", name: "Ben's Bites", url: "https://bensbites.com/feed" },
  ],
  newsletterLookbackDays: 14,
  /** Max X posts read via oEmbed per run (newsletters + X API). */
  maxXPosts: 30,
  /** Max product pages fetched for metadata per run (only for new candidates). */
  maxPageFetches: 40,

  /** Domains never treated as "a product" (news, social, platforms, big labs are covered elsewhere). */
  excludeDomains: [
    "x.com", "twitter.com", "t.co", "youtube.com", "youtu.be", "linkedin.com", "facebook.com", "instagram.com", "reddit.com",
    "substack.com", "substackcdn.com", "bensbites.com", "bensbites.substack.com", "therundown.ai", "medium.com", "notion.site",
    "techcrunch.com", "theverge.com", "bloomberg.com", "reuters.com", "wsj.com", "nytimes.com", "cnbc.com", "wired.com",
    "a16z.com", "simonwillison.net", "wikipedia.org", "apple.com", "apps.apple.com", "play.google.com", "google.com",
    "docs.google.com", "bit.ly", "lu.ma", "luma.com", "calendly.com", "typeform.com", "forms.gle", "beehiiv.com",
  ],

  /** X accounts of labs already tracked in AI Labs — their posts are skipped here. */
  labHandles: [
    "openai", "chatgpt", "openaidevs", "sama", "anthropicai", "claudeai", "claudedevs", "googleai", "googledeepmind",
    "googleaistudio", "geminiapp", "xai", "grok", "elonmusk", "deepseek_ai", "alibaba_qwen", "kimi_moonshot", "zai_org",
    "aiatmeta", "mistralai", "minimax__ai", "cohere", "microsoft", "msftresearch", "awscloud", "baidu_inc", "tencent",
    "bytedanceoss", "nvidia", "nvidiaai", "ai21labs", "ibm", "huggingface",
  ],

  /** Optional paid X API v2 recent search (only runs when X_BEARER_TOKEN is set). */
  xApi: {
    query: '(introducing OR launching OR "just launched" OR "now live" OR "open source") (AI OR agent OR LLM) has:links -is:retweet -is:reply lang:en',
    minLikes: 300,
    maxResults: 50,
  },

  startupNews: [
    { id: "techcrunch-ai", name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/" },
    { id: "gnews-ai-startups", name: "Google News", url: "https://news.google.com/rss/search?q=%22AI%22+startup+(raises+OR+launches+OR+acquires)+when:7d&hl=en-US&gl=US&ceid=US:en" },
    { id: "yc-blog", name: "Y Combinator Blog", url: "https://www.ycombinator.com/blog/feed" },
  ],
  startupNewsKeepDays: 21,

  hfSpaces: {
    minLikes: 60,
    max: 12,
    exclude: "(uncensored|nsfw|nude|naked|porn|hentai|lewd|erotic|sexy|\\beros\\b|10eros|face[- ]?swap|undress|deepnude|onlyfans)",
  },
} as const;
